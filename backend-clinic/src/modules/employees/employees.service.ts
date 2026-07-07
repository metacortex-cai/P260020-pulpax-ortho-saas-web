import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { InviteEmployeeDto } from './dto/invite-employee.dto';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateLeaveDto, CreateContractDto, UpdateContractDto, BulkUpdateWorkHoursDto, UpdateLeaveStatusDto, UpsertLeaveEntitlementDto } from './dto/hr.dto';
import { UpsertEmployeeProfileDto } from './dto/employee-profile.dto';
import { CreateEmployeeContactDto } from './dto/employee-contact.dto';
import { UploadEmployeeDocumentDto } from './dto/employee-document.dto';
import { EmailService } from '../email/email.service';
import { AuditLogService } from '../../common/services/audit-log.service';

// Devir/silme kontrolünde "hâlâ devam ediyor" sayılan durumlar bunların dışındaki her şeydir.
const CLOSED_APPOINTMENT_STATUSES = ['COMPLETED', 'CANCELLED'];
const CLOSED_TREATMENT_ITEM_STATUSES = ['COMPLETED', 'CANCELLED'];

@Injectable()
export class EmployeesService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditLog: AuditLogService,
  ) {}

  // --- Personel (İK) CRUD — tenant DB, master User/rol kavramından bağımsız ---

  async create(createDto: CreateEmployeeDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const emailHash = EncryptionUtil.hashEmail(createDto.email);

    const existing = await client.employee.findUnique({ where: { emailHash } });
    if (existing) {
      throw new BadRequestException('Bu e-posta adresi zaten kullanımda.');
    }

    // Plan limit kontrolü (Hekim/Doktor Sayısı)
    if (createDto.isDoctor) {
      const clinic = await this.prisma.clinic.findUnique({ where: { id: clinicId } });
      if (clinic) {
        const activeDoctorCount = await client.employee.count({
          where: { clinicId, isDoctor: true, isActive: true }
        });

        const plan = clinic.plan.toUpperCase();
        let maxDoctors = 999;
        if (plan === 'FREE' || plan === 'STARTER') {
          maxDoctors = 1;
        } else if (plan === 'BASIC' || plan === 'PRO' || plan === 'PROFESSIONAL') {
          maxDoctors = 5;
        }

        if (activeDoctorCount >= maxDoctors) {
          throw new BadRequestException(`Mevcut abonelik planınız (${clinic.plan}) en fazla ${maxDoctors} hekim kaydetmenize izin veriyor. Lütfen planınızı yükseltin.`);
        }
      }
    }

    const emailEncrypted = EncryptionUtil.encrypt(createDto.email);
    const nationalIdEncrypted = createDto.nationalId ? EncryptionUtil.encrypt(createDto.nationalId) : null;

    const employee = await client.employee.create({
      data: {
        clinicId,
        firstName: createDto.firstName,
        lastName: createDto.lastName,
        email: emailEncrypted,
        emailHash,
        phone: createDto.phone,
        nationalId: nationalIdEncrypted,
        title: createDto.title,
        isDoctor: !!createDto.isDoctor,
        isActive: true,
      }
    });

    const synced = await this.syncDoctorLink(client, employee);
    return this.decryptEmployeeData(synced);
  }

  // Employee ile Doctor ayrı modeller olarak yaşıyor (bkz. restorasyon planı — appointment/
  // treatment/ortodonti FK'ları Doctor'a bağlı kalmaya devam ediyor). isDoctor=true olan bir
  // Employee'nin randevu/tedavi seçicilerinde görünebilmesi için burada bağlı bir Doctor kaydı
  // upsert edilir ve Employee.doctorId ile ilişkilendirilir; isDoctor=false olduğunda ise
  // (varsa) bağlı Doctor pasifleştirilir.
  private async syncDoctorLink(client: any, employee: any) {
    if (!employee.isDoctor) {
      if (employee.doctorId) {
        await client.doctor.update({ where: { id: employee.doctorId }, data: { isActive: false } }).catch(() => undefined);
      }
      return employee;
    }

    const doctorData = {
      clinicId: employee.clinicId,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      phone: employee.phone,
      title: employee.title,
      photoUrl: employee.photoUrl,
      isDoctor: true,
      isActive: employee.isActive,
    };

    if (employee.doctorId) {
      await client.doctor.update({ where: { id: employee.doctorId }, data: doctorData });
      return employee;
    }

    const existingDoctor = await client.doctor.findUnique({ where: { emailHash: employee.emailHash } });
    const doctor = existingDoctor
      ? await client.doctor.update({ where: { id: existingDoctor.id }, data: doctorData })
      : await client.doctor.create({ data: { ...doctorData, emailHash: employee.emailHash } });

    return client.employee.update({ where: { id: employee.id }, data: { doctorId: doctor.id } });
  }

  // Var olan bir Employee'ye giriş hesabı (master User) bağlar — Personel oluşturma akışından ayrık.
  async invite(employeeId: string, clinicId: string, dto: InviteEmployeeDto) {
    const client = await this.tenantPrisma.getClient();
    const employee = await this.assertEmployeeInClinic(employeeId, clinicId);

    if (employee.userId) {
      throw new BadRequestException('Bu personelin zaten bir kullanıcı hesabı var.');
    }

    const plaintextEmail = employee.email.includes(':') ? EncryptionUtil.decrypt(employee.email) || employee.email : employee.email;
    const emailHash = EncryptionUtil.hashEmail(plaintextEmail);

    const existingUser = await this.prisma.user.findUnique({ where: { emailHash } });
    if (existingUser) {
      throw new BadRequestException('Bu e-posta adresi ile zaten bir kullanıcı hesabı mevcut.');
    }

    const role = dto.role || (employee.isDoctor ? 'DOCTOR' : 'ASSISTANT');
    const hashedPassword = dto.password ? await bcrypt.hash(dto.password, 10) : null;

    const user = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          emailHash,
          password: hashedPassword,
          phone: employee.phone,
          nationalId: employee.nationalId,
          title: employee.title,
          role,
          clinicId,
          isActive: true,
          employeeId: employee.id,
        }
      });

      await tx.userClinic.create({
        data: { userId: user.id, clinicId, role, isActive: true }
      });

      return user;
    });

    await client.employee.update({ where: { id: employeeId }, data: { userId: user.id } });

    if (!hashedPassword) {
      await this.sendInviteEmail(user.id, employee.firstName, plaintextEmail);
    }

    return { id: user.id, employeeId: employee.id, role, invited: !hashedPassword };
  }

  private async sendInviteEmail(userId: string, firstName: string, email: string) {
    const payload = JSON.stringify({
      userId,
      purpose: 'INVITE',
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 gün
    });
    const token = EncryptionUtil.encrypt(payload);
    const inviteLink = `https://localhost:7001/login?inviteToken=${encodeURIComponent(token)}`;
    await this.emailService.sendInviteEmail(email, firstName, inviteLink);
  }

  async findAll(clinicId: string, includePassive: boolean = false) {
    const client = await this.tenantPrisma.getClient();
    const employees = await client.employee.findMany({
      where: { clinicId, ...(includePassive ? {} : { isActive: true }) },
      orderBy: { createdAt: 'desc' },
    });

    // Takvim ekranı hekim rengini Personel modülünden okur (spec §2.1) — tek sorguda toplu getirilir
    const profiles = await client.employeeProfile.findMany({
      where: { employeeId: { in: employees.map((e: any) => e.id) } },
      select: { employeeId: true, calendarColor: true },
    });
    const colorByEmployeeId = new Map(profiles.map((p: any) => [p.employeeId, p.calendarColor]));

    return employees.map((e: any) => ({ ...this.decryptEmployeeData(e), calendarColor: colorByEmployeeId.get(e.id) || null }));
  }

  async findOne(id: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const employee = await client.employee.findFirst({ where: { id, clinicId } });
    if (!employee) {
      throw new NotFoundException(`Personel (${id}) bulunamadı.`);
    }

    const [leaves, contracts, workHours, profile, contacts, documents] = await Promise.all([
      client.employeeLeave.findMany({ where: { employeeId: id }, orderBy: { startAt: 'desc' } }),
      client.employeeContract.findMany({
        where: { employeeId: id },
        orderBy: { createdAt: 'desc' },
        include: { categoryRates: true, itemFees: true },
      }),
      client.employeeWorkHour.findMany({ where: { employeeId: id }, orderBy: { dayOfWeek: 'asc' } }),
      client.employeeProfile.findUnique({ where: { employeeId: id } }),
      client.employeeContact.findMany({ where: { employeeId: id, clinicId }, orderBy: { createdAt: 'asc' } }),
      client.employeeDocument.findMany({ where: { employeeId: id, clinicId }, orderBy: { createdAt: 'desc' } }),
    ]);

    return {
      ...this.decryptEmployeeData(employee),
      leaves,
      contracts,
      workHours,
      profile: profile ? this.decryptProfileData(profile) : null,
      contacts,
      documents,
    };
  }

  async update(id: string, dto: UpdateEmployeeDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.employee.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Personel (${id}) bulunamadı.`);
    }

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.isDoctor !== undefined) updateData.isDoctor = dto.isDoctor;
    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
      updateData.deactivatedAt = dto.isActive ? null : new Date();
      updateData.deactivationReason = dto.isActive ? null : 'Yönetici tarafından kapatıldı';
    }

    if (dto.nationalId !== undefined) {
      updateData.nationalId = dto.nationalId ? EncryptionUtil.encrypt(dto.nationalId) : null;
    }

    if (dto.email) {
      const emailHash = EncryptionUtil.hashEmail(dto.email);
      const duplicate = await client.employee.findFirst({ where: { emailHash, NOT: { id } } });
      if (duplicate) {
        throw new BadRequestException('Bu e-posta adresi başka bir personel tarafından kullanılıyor.');
      }
      updateData.email = EncryptionUtil.encrypt(dto.email);
      updateData.emailHash = emailHash;
    }

    const updated = await client.employee.update({ where: { id }, data: updateData });
    const synced = await this.syncDoctorLink(client, updated);
    return this.decryptEmployeeData(synced);
  }

  // Bir hekimin işten çıkışı öncesi devredilmesi gereken kayıtları sayar: hâlâ süren
  // (tamamlanmamış/iptal edilmemiş) randevular, kendisine atanmış hastalar ve tamamlanmamış
  // tedavi kalemleri. isDoctor=false ise devir konusu değildir, her zaman sıfır döner.
  async getTerminationImpact(employeeId: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const employee = await client.employee.findFirst({ where: { id: employeeId, clinicId } });
    if (!employee) {
      throw new NotFoundException(`Personel (${employeeId}) bulunamadı veya yetkiniz yok.`);
    }

    if (!employee.isDoctor || !employee.doctorId) {
      return { appointmentCount: 0, patientCount: 0, incompleteTreatmentCount: 0, requiresTransfer: false };
    }

    // Appointment/Patient/TreatmentItem FK'ları Doctor.id'ye bağlı (bkz. Employee.doctorId köprüsü).
    const doctorId = employee.doctorId;
    const [appointmentCount, patientCount, incompleteTreatmentCount] = await Promise.all([
      client.appointment.count({
        where: { clinicId, doctorId, status: { notIn: CLOSED_APPOINTMENT_STATUSES } },
      }),
      client.patient.count({ where: { clinicId, assignedDoctor: doctorId } }),
      client.treatmentItem.count({
        where: { doctorId, status: { notIn: CLOSED_TREATMENT_ITEM_STATUSES }, plan: { clinicId } },
      }),
    ]);

    return {
      appointmentCount,
      patientCount,
      incompleteTreatmentCount,
      requiresTransfer: appointmentCount + patientCount + incompleteTreatmentCount > 0,
    };
  }

  async deactivate(
    id: string,
    reason: string,
    clinicId: string,
    deactivatedAt?: string,
    transferToEmployeeId?: string,
    actingUserId?: string,
  ) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.employee.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Personel (${id}) bulunamadı veya yetkiniz yok.`);
    }

    if (existing.isDoctor) {
      const impact = await this.getTerminationImpact(id, clinicId);
      if (impact.requiresTransfer) {
        if (!transferToEmployeeId) {
          throw new BadRequestException(
            'Bu hekime atanmış aktif randevu, hasta veya tamamlanmamış tedavi kaydı var. Devam etmek için devralacak bir hekim seçmelisiniz.',
          );
        }
        if (transferToEmployeeId === id) {
          throw new BadRequestException('Devralacak hekim, işten çıkarılan hekimle aynı olamaz.');
        }
        const newDoctorEmployee = await client.employee.findFirst({
          where: { id: transferToEmployeeId, clinicId, isDoctor: true, isActive: true },
        });
        if (!newDoctorEmployee || !newDoctorEmployee.doctorId) {
          throw new BadRequestException('Seçilen devralacak hekim bulunamadı, aktif değil veya hekim rolünde değil.');
        }

        // Appointment/Patient/TreatmentItem FK'ları Doctor.id'ye bağlı — devir de o id'ler üzerinden yapılır.
        const fromDoctorId = existing.doctorId;
        const toDoctorId = newDoctorEmployee.doctorId;

        await client.$transaction([
          client.appointment.updateMany({
            where: { clinicId, doctorId: fromDoctorId, status: { notIn: CLOSED_APPOINTMENT_STATUSES } },
            data: { doctorId: toDoctorId },
          }),
          client.patient.updateMany({
            where: { clinicId, assignedDoctor: fromDoctorId },
            data: { assignedDoctor: toDoctorId },
          }),
          client.treatmentItem.updateMany({
            where: { doctorId: fromDoctorId, status: { notIn: CLOSED_TREATMENT_ITEM_STATUSES }, plan: { clinicId } },
            data: { doctorId: toDoctorId },
          }),
        ]);

        await this.auditLog.log({
          userId: actingUserId,
          clinicId,
          action: 'DOCTOR_TERMINATED_WITH_TRANSFER',
          entity: 'Employee',
          entityId: id,
          details: { transferredTo: transferToEmployeeId, ...impact },
        });
      }
    }

    const updated = await client.employee.update({
      where: { id },
      data: {
        isActive: false,
        deactivatedAt: deactivatedAt ? new Date(deactivatedAt) : new Date(),
        deactivationReason: reason,
      },
    });
    return this.syncDoctorLink(client, updated);
  }

  async reactivate(id: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.employee.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Personel (${id}) bulunamadı veya yetkiniz yok.`);
    }

    const updated = await client.employee.update({
      where: { id },
      data: { isActive: true, deactivatedAt: null, deactivationReason: null },
    });
    return this.syncDoctorLink(client, updated);
  }

  // Personel kaydını kalıcı olarak siler. Randevu/tedavi/prim gibi ilişkili kayıtları
  // varsa FK kısıtlaması nedeniyle silme başarısız olur — bu durumda kullanıcıya
  // "İşten Çıkış" (deactivate) akışını kullanması önerilir.
  async remove(id: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.employee.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Personel (${id}) bulunamadı veya yetkiniz yok.`);
    }

    // Appointment/Patient/TreatmentItem artık Employee'ye değil bağlı Doctor'a FK'lı olduğu
    // için Prisma silme sırasında bunları tespit edemez — devam eden randevu/tedavisi olan bir
    // hekimi burada elle engelliyoruz (eski FK-kısıtlaması davranışının karşılığı).
    if (existing.isDoctor && existing.doctorId) {
      const impact = await this.getTerminationImpact(id, clinicId);
      if (impact.requiresTransfer) {
        throw new BadRequestException(
          'Bu personelin randevu, tedavi, prim veya izin gibi ilişkili kayıtları olduğu için silinemiyor. Lütfen "İşten Çıkış" işlemini kullanın.',
        );
      }
    }

    try {
      await client.employee.delete({ where: { id } });
    } catch (error: any) {
      if (error?.code === 'P2003' || error?.code === 'P2014') {
        throw new BadRequestException(
          'Bu personelin randevu, tedavi, prim veya izin gibi ilişkili kayıtları olduğu için silinemiyor. Lütfen "İşten Çıkış" işlemini kullanın.',
        );
      }
      throw error;
    }

    // Personelin bağlı bir giriş hesabı (master DB User) varsa, silme sonrası
    // sahipsiz kalan hesabın aktif kalmasını (zombi login) önlemek için pasifleştir.
    if (existing.userId) {
      await this.prisma.user.update({
        where: { id: existing.userId },
        data: {
          isActive: false,
          deactivatedAt: new Date(),
          deactivationReason: 'İlişkili personel kaydı silindi.',
        },
      }).catch(() => undefined);
    }

    return { id, deleted: true };
  }

  // --- Personel Profili (ADR-003) ---

  private async assertEmployeeInClinic(employeeId: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const employee = await client.employee.findFirst({ where: { id: employeeId, clinicId } });
    if (!employee) {
      throw new NotFoundException(`Personel (${employeeId}) bulunamadı.`);
    }
    return employee;
  }

  async upsertProfile(employeeId: string, clinicId: string, dto: UpsertEmployeeProfileDto) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();

    const data = {
      clinicId,
      employeeId,
      personnelType: dto.personnelType,
      birthDate: dto.birthDate ? EncryptionUtil.encrypt(dto.birthDate) : null,
      bloodType: dto.bloodType,
      school: dto.school,
      educationField: dto.educationField,
      educationLevel: dto.educationLevel,
      graduationYear: dto.graduationYear,
      diplomaNo: dto.diplomaNo,
      department: dto.department,
      position: dto.position,
      hireDate: dto.hireDate ? new Date(dto.hireDate) : null,
      employmentType: dto.employmentType,
      sgkRegistryNo: dto.sgkRegistryNo ? EncryptionUtil.encrypt(dto.sgkRegistryNo) : null,
      calendarColor: dto.calendarColor,
    };

    const profile = await client.employeeProfile.upsert({
      where: { employeeId },
      update: data,
      create: data,
    });

    return this.decryptProfileData(profile);
  }

  async getProfile(employeeId: string, clinicId: string) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();
    const profile = await client.employeeProfile.findUnique({ where: { employeeId } });
    return profile ? this.decryptProfileData(profile) : null;
  }

  private decryptProfileData(profile: any) {
    if (profile.birthDate && profile.birthDate.includes(':')) {
      profile.birthDate = EncryptionUtil.decrypt(profile.birthDate) || profile.birthDate;
    }
    if (profile.sgkRegistryNo && profile.sgkRegistryNo.includes(':')) {
      profile.sgkRegistryNo = EncryptionUtil.decrypt(profile.sgkRegistryNo) || profile.sgkRegistryNo;
    }
    return profile;
  }

  // --- İletişim Bilgileri (ADR-003) ---

  async listContacts(employeeId: string, clinicId: string) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();
    return client.employeeContact.findMany({ where: { employeeId, clinicId }, orderBy: { createdAt: 'asc' } });
  }

  async createContact(employeeId: string, clinicId: string, dto: CreateEmployeeContactDto) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();
    return client.employeeContact.create({ data: { ...dto, employeeId, clinicId } });
  }

  async deleteContact(employeeId: string, clinicId: string, contactId: string) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();
    const contact = await client.employeeContact.findFirst({ where: { id: contactId, employeeId, clinicId } });
    if (!contact) {
      throw new NotFoundException(`İletişim kaydı (${contactId}) bulunamadı.`);
    }
    return client.employeeContact.delete({ where: { id: contactId } });
  }

  // --- Dokümanlar (ADR-003) ---

  async listDocuments(employeeId: string, clinicId: string) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();
    return client.employeeDocument.findMany({ where: { employeeId, clinicId }, orderBy: { createdAt: 'desc' } });
  }

  async addDocumentWithFile(
    employeeId: string,
    clinicId: string,
    file: any,
    dto: UploadEmployeeDocumentDto,
    userId?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı.');
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();

    return client.employeeDocument.create({
      data: {
        employeeId,
        clinicId,
        name: dto.name || file.originalname,
        fileType: file.mimetype || 'application/octet-stream',
        category: dto.category || 'DIGER',
        fileUrl: `/uploads/employee-documents/${file.filename}`,
        fileSize: file.size,
        description: dto.description,
        uploadedBy: userId,
      },
    });
  }

  async deleteDocument(employeeId: string, clinicId: string, documentId: string) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();
    const document = await client.employeeDocument.findFirst({ where: { id: documentId, employeeId, clinicId } });
    if (!document) {
      throw new NotFoundException(`Doküman (${documentId}) bulunamadı.`);
    }
    return client.employeeDocument.delete({ where: { id: documentId } });
  }

  async updatePhoto(employeeId: string, clinicId: string, file: any) {
    if (!file) throw new BadRequestException('Fotoğraf bulunamadı.');
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();

    const updated = await client.employee.update({
      where: { id: employeeId },
      data: { photoUrl: `/uploads/employee-photos/${file.filename}` },
    });
    return this.syncDoctorLink(client, updated);
  }

  async deletePhoto(employeeId: string, clinicId: string) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();

    const updated = await client.employee.update({
      where: { id: employeeId },
      data: { photoUrl: null },
    });
    return this.syncDoctorLink(client, updated);
  }

  // --- HR / Tenant Methods ---

  async createLeave(dto: CreateLeaveDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    // Yalnızca hekim personel için: izin aralığıyla çakışan mevcut randevu var mı?
    // (Personel dışı personelin izni takvimi etkilemiyor — spec §6.1.1)
    // Appointment.doctorId bir Doctor.id olduğu için employee.doctorId üzerinden sorgulanır.
    const employee = await client.employee.findUnique({ where: { id: dto.employeeId }, select: { isDoctor: true, doctorId: true } });
    if (employee?.isDoctor && employee.doctorId && !dto.force) {
      const conflicting = await client.appointment.findMany({
        where: {
          clinicId,
          doctorId: employee.doctorId,
          status: { notIn: ['CANCELLED', 'NO_SHOW', 'POSTPONED'] },
          startOn: { lt: endAt },
          endOn: { gt: startAt },
        },
        include: { patient: { select: { firstName: true, lastName: true } } },
        orderBy: { startOn: 'asc' },
      });
      if (conflicting.length > 0) {
        throw new ConflictException({
          conflict: true,
          appointmentCount: conflicting.length,
          appointments: conflicting.map((a) => ({
            id: a.id,
            patientName: `${a.patient.firstName} ${a.patient.lastName}`,
            startOn: a.startOn,
            endOn: a.endOn,
          })),
        });
      }
    }

    return client.employeeLeave.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        startAt,
        endAt,
        clinicId,
        isFullDay: dto.isFullDay ?? false,
        description: dto.description,
      },
    });
  }

  async findAllLeaves(clinicId: string, startDate?: string, endDate?: string) {
    const client = await this.tenantPrisma.getClient();
    const where: any = { clinicId };
    // Takvim ekranı, görünür aralıkla kesişen izinleri çeker (overlap mantığı)
    if (startDate && endDate) {
      where.startAt = { lte: new Date(endDate) };
      where.endAt = { gte: new Date(startDate) };
    }
    return client.employeeLeave.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateLeaveStatus(leaveId: string, clinicId: string, dto: UpdateLeaveStatusDto, approverId?: string) {
    const client = await this.tenantPrisma.getClient();
    const leave = await client.employeeLeave.findFirst({ where: { id: leaveId, clinicId } });
    if (!leave) {
      throw new NotFoundException(`İzin talebi (${leaveId}) bulunamadı.`);
    }

    return client.employeeLeave.update({
      where: { id: leaveId },
      data: {
        status: dto.status,
        approvedBy: dto.status === 'PENDING' ? null : approverId,
        approvedAt: dto.status === 'PENDING' ? null : new Date(),
        rejectionReason: dto.status === 'REJECTED' ? dto.rejectionReason : null,
      },
    });
  }

  // --- İzin Hak Edişi (ADR-003 Faz 2) ---

  async getLeaveEntitlement(employeeId: string, clinicId: string, year: number) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();

    const [entitlement, approvedLeaves] = await Promise.all([
      client.employeeLeaveEntitlement.findUnique({ where: { clinicId_employeeId_year: { clinicId, employeeId, year } } }),
      client.employeeLeave.findMany({
        where: {
          clinicId,
          employeeId,
          type: 'ANNUAL',
          status: 'APPROVED',
          startAt: { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31T23:59:59.999Z`) },
        },
      }),
    ]);

    const usedDays = approvedLeaves.reduce((sum, leave) => {
      const days = Math.floor((leave.endAt.getTime() - leave.startAt.getTime()) / 86400000) + 1;
      return sum + days;
    }, 0);

    const totalDays = entitlement ? Number(entitlement.totalDays) : 0;
    const carryOverDays = entitlement ? Number(entitlement.carryOverDays) : 0;

    return {
      year,
      totalDays,
      carryOverDays,
      usedDays,
      remainingDays: totalDays + carryOverDays - usedDays,
    };
  }

  async upsertLeaveEntitlement(employeeId: string, clinicId: string, dto: UpsertLeaveEntitlementDto) {
    await this.assertEmployeeInClinic(employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();

    const data = {
      clinicId,
      employeeId,
      year: dto.year,
      totalDays: dto.totalDays,
      carryOverDays: dto.carryOverDays ?? 0,
    };

    return client.employeeLeaveEntitlement.upsert({
      where: { clinicId_employeeId_year: { clinicId, employeeId, year: dto.year } },
      update: data,
      create: data,
    });
  }

  async createContract(dto: CreateContractDto, clinicId: string) {
    await this.assertEmployeeInClinic(dto.employeeId, clinicId);
    const client = await this.tenantPrisma.getClient();
    const { categoryRates, itemFees, ...contractFields } = dto;

    return client.employeeContract.create({
      data: {
        ...contractFields,
        clinicId,
        validFrom: new Date(dto.validFrom),
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        ...(categoryRates?.length
          ? { categoryRates: { create: categoryRates.map((c) => ({ category: c.category, rate: c.rate })) } }
          : {}),
        ...(itemFees?.length
          ? { itemFees: { create: itemFees.map((f) => ({ masterTreatmentId: f.masterTreatmentId, fixedFee: f.fixedFee })) } }
          : {}),
      },
      include: { categoryRates: true, itemFees: true },
    });
  }

  async updateContract(contractId: string, dto: UpdateContractDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.employeeContract.findFirst({ where: { id: contractId, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Sözleşme (${contractId}) bulunamadı.`);
    }

    const { categoryRates, itemFees, ...contractFields } = dto;

    return client.$transaction(async (tx) => {
      if (categoryRates !== undefined) {
        await tx.employeeContractCategoryRate.deleteMany({ where: { contractId } });
      }
      if (itemFees !== undefined) {
        await tx.employeeContractItemFee.deleteMany({ where: { contractId } });
      }

      return tx.employeeContract.update({
        where: { id: contractId },
        data: {
          ...contractFields,
          ...(dto.validFrom ? { validFrom: new Date(dto.validFrom) } : {}),
          ...(dto.validUntil !== undefined ? { validUntil: dto.validUntil ? new Date(dto.validUntil) : null } : {}),
          ...(categoryRates?.length
            ? { categoryRates: { create: categoryRates.map((c) => ({ category: c.category, rate: c.rate })) } }
            : {}),
          ...(itemFees?.length
            ? { itemFees: { create: itemFees.map((f) => ({ masterTreatmentId: f.masterTreatmentId, fixedFee: f.fixedFee })) } }
            : {}),
        },
        include: { categoryRates: true, itemFees: true },
      });
    });
  }

  async deleteContract(contractId: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.employeeContract.findFirst({ where: { id: contractId, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Sözleşme (${contractId}) bulunamadı.`);
    }
    return client.employeeContract.delete({ where: { id: contractId } });
  }

  async updateWorkHours(dto: BulkUpdateWorkHoursDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();

    return client.$transaction(
      dto.workHours.map(wh =>
        client.employeeWorkHour.upsert({
          where: {
            clinicId_employeeId_dayOfWeek: {
              clinicId,
              employeeId: dto.employeeId,
              dayOfWeek: wh.dayOfWeek
            }
          },
          update: {
            isWorking: wh.isWorking,
            startTime: wh.startTime,
            endTime: wh.endTime
          },
          create: {
            clinicId,
            employeeId: dto.employeeId,
            dayOfWeek: wh.dayOfWeek,
            isWorking: wh.isWorking,
            startTime: wh.startTime,
            endTime: wh.endTime
          }
        })
      )
    );
  }

  // Takvim yüklenirken seçili hekimlerin mesai saatlerini tek seferde çekmek için (spec §10.7 notu)
  async getWorkHoursBulk(employeeIds: string[], clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const rows = await client.employeeWorkHour.findMany({
      where: { clinicId, employeeId: { in: employeeIds } },
      orderBy: { dayOfWeek: 'asc' },
    });

    const result: Record<string, typeof rows> = {};
    for (const employeeId of employeeIds) {
      result[employeeId] = rows.filter((r) => r.employeeId === employeeId);
    }
    return result;
  }

  private decryptEmployeeData(employee: any) {
    if (employee.email && employee.email.includes(':')) {
      employee.email = EncryptionUtil.decrypt(employee.email) || employee.email;
    }
    if (employee.nationalId && employee.nationalId.includes(':')) {
      employee.nationalId = EncryptionUtil.decrypt(employee.nationalId) || employee.nationalId;
    }
    if (employee.title && employee.title.includes(':')) {
      employee.title = EncryptionUtil.decrypt(employee.title) || employee.title;
    }
    return employee;
  }
}
