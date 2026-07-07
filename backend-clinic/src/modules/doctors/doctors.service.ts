import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

/**
 * Pulpax Ortho: minimal Doctor CRUD'u — yalnızca randevu/tedavi/ortodonti
 * ekranlarındaki hekim seçim listelerini ve hekimin kendi hesap bilgilerini
 * (ad/soyad/telefon/unvan/fotoğraf) servis eder; izin/mesai/sözleşme/prim gibi
 * İK özellikleri bilerek burada yoktur (bkz. EmployeesModule). İK modülü geri
 * getirildikten sonra isDoctor=true olan Employee kayıtları EmployeesService
 * tarafından buradaki Doctor kayıtlarına senkronize edilir (Employee.doctorId
 * köprüsü) — bu CRUD'lar hâlâ doğrudan da (İK dışı) hekim oluşturmak için kullanılabilir.
 */
@Injectable()
export class DoctorsService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  private decrypt(doctor: any) {
    if (!doctor) return doctor;
    const decrypted = { ...doctor };
    if (decrypted.email && decrypted.email.includes(':')) {
      decrypted.email = EncryptionUtil.decrypt(decrypted.email) || decrypted.email;
    }
    return decrypted;
  }

  async findAll(clinicId: string, includePassive = false) {
    const client = await this.tenantPrisma.getClient();
    const doctors = await client.doctor.findMany({
      where: { clinicId, ...(includePassive ? {} : { isActive: true }) },
      orderBy: { firstName: 'asc' },
    });
    return doctors.map((d) => this.decrypt(d));
  }

  async findOne(id: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const doctor = await client.doctor.findFirst({ where: { id, clinicId } });
    if (!doctor) {
      throw new NotFoundException(`Hekim (${id}) bulunamadı.`);
    }
    return this.decrypt(doctor);
  }

  async create(dto: CreateDoctorDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const emailHash = EncryptionUtil.hashEmail(dto.email);

    const existing = await client.doctor.findUnique({ where: { emailHash } });
    if (existing) {
      throw new BadRequestException('Bu e-posta adresi zaten kayıtlı bir hekime ait.');
    }

    const created = await client.doctor.create({
      data: {
        clinicId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: EncryptionUtil.encrypt(dto.email),
        emailHash,
        phone: dto.phone,
        title: dto.title,
        isDoctor: dto.isDoctor ?? true,
      },
    });
    return this.decrypt(created);
  }

  async update(id: string, dto: UpdateDoctorDto, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.doctor.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Hekim (${id}) bulunamadı.`);
    }

    const updateData: any = {};
    if (dto.firstName !== undefined) updateData.firstName = dto.firstName;
    if (dto.lastName !== undefined) updateData.lastName = dto.lastName;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.isDoctor !== undefined) updateData.isDoctor = dto.isDoctor;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (dto.email) {
      const emailHash = EncryptionUtil.hashEmail(dto.email);
      const duplicate = await client.doctor.findFirst({ where: { emailHash, NOT: { id } } });
      if (duplicate) {
        throw new BadRequestException('Bu e-posta adresi başka bir hekim tarafından kullanılıyor.');
      }
      updateData.email = EncryptionUtil.encrypt(dto.email);
      updateData.emailHash = emailHash;
    }

    const updated = await client.doctor.update({ where: { id }, data: updateData });
    return this.decrypt(updated);
  }

  async uploadPhoto(id: string, clinicId: string, file: any) {
    if (!file) throw new BadRequestException('Fotoğraf bulunamadı.');
    const client = await this.tenantPrisma.getClient();
    const existing = await client.doctor.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Hekim (${id}) bulunamadı.`);
    }

    const updated = await client.doctor.update({
      where: { id },
      data: { photoUrl: `/uploads/doctor-photos/${file.filename}` },
    });
    return this.decrypt(updated);
  }

  async deletePhoto(id: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    const existing = await client.doctor.findFirst({ where: { id, clinicId } });
    if (!existing) {
      throw new NotFoundException(`Hekim (${id}) bulunamadı.`);
    }

    const updated = await client.doctor.update({ where: { id }, data: { photoUrl: null } });
    return this.decrypt(updated);
  }
}
