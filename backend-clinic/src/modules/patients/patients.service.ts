import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreatePatientDocumentDto, UploadPatientDocumentDto } from './dto/patient-document.dto';
import { CreateImplantDto, UpdateImplantDto } from './dto/implant.dto';
import { CreateDiagnosisDto } from './dto/diagnosis.dto';
import { CreatePrescriptionDto } from './dto/prescription.dto';
import { CreateNoteDto } from './dto/note.dto';
import { EncryptionUtil } from '../../common/utils/encryption.util';
import { isValidTcKimlikNo } from '../../common/utils/tckn.util';
import { EVENTS } from '../../common/events/domain-events';
import { OcrService } from './ocr.service';

const ROLE_LABEL: Record<string, string> = {
  SUPERADMIN: 'Süper Yönetici',
  ADMIN: 'Yönetici',
  DOCTOR: 'Hekim',
  ASSISTANT: 'Asistan',
  RECEPTION: 'Resepsiyon',
};

/**
 * Hasta durumu (Aday / Aktif / Pasif):
 * - Aday: Hiçbir tedavi planı sözleşmeye (ACTIVE) dönmemiş — cari oluşmaz.
 * - Aktif: Sözleşmesi (ACTIVE plan) var ve tamamlanmamış (COMPLETED/CANCELLED
 *   dışı) tedavi kalemi var.
 * - Pasif: Sözleşmesi var ve sözleşmeli planlardaki tüm kalemler tamamlanmış.
 */
function computePatientStatus(
  treatmentPlans: { status: string; items: { status: string }[] }[],
): 'ADAY' | 'AKTIF' | 'PASIF' {
  const activePlans = treatmentPlans.filter((plan) => plan.status === 'ACTIVE');
  if (activePlans.length === 0) return 'ADAY';

  const hasIncompleteTreatment = activePlans.some((plan) =>
    plan.items.some((item) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED'),
  );

  return hasIncompleteTreatment ? 'AKTIF' : 'PASIF';
}

@Injectable()
export class PatientsService {
  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly ocrService: OcrService,
  ) { }

  async create(createPatientDto: CreatePatientDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const isTurkish = (createPatientDto.nationality ?? 'Türkiye') === 'Türkiye';
    if (createPatientDto.nationalId && isTurkish && !isValidTcKimlikNo(createPatientDto.nationalId)) {
      throw new BadRequestException('Geçersiz TC Kimlik Numarası');
    }
    const nationalIdEncrypted = createPatientDto.nationalId
      ? EncryptionUtil.encrypt(createPatientDto.nationalId)
      : undefined;

    // Determine next sequential file number for this clinic
    const agg = await tenantDb.patient.aggregate({
      where: { clinicId },
      _max: { fileNo: true },
    });
    const currentMax = (agg as any)?._max?.fileNo || 0;
    const nextFileNo = currentMax + 1;

    const patient = await tenantDb.patient.create({
      data: {
        ...createPatientDto,
        countryCode: createPatientDto.countryCode || '+90',
        nationalId: nationalIdEncrypted,
        clinicId,
        fileNo: nextFileNo,
      },
    });

    // Entegrasyonlar için event fırlat (Örn: Paraşüt)
    this.eventEmitter.emit(EVENTS.PATIENT_CREATED, {
      patientId: patient.id,
      clinicId,
      data: patient,
    });

    if (patient.nationalId) {
      patient.nationalId = EncryptionUtil.decrypt(patient.nationalId) || patient.nationalId;
    }
    return { ...patient, status: 'ADAY' as const };
  }

  // Sunucu tarafında sıralamaya izin verilen kolonlar (SQL injection / geçersiz alan koruması)
  private static readonly SORTABLE_FIELDS = new Set([
    'firstName', 'lastName', 'phone', 'createdAt', 'birthDate', 'fileNo',
  ]);

  async findAll(
    clinicId: string,
    options?: { page?: number; limit?: number; search?: string; sortBy?: string; sortDir?: string },
  ) {
    const tenantDb = await this.tenantPrisma.getClient();

    const page = Math.max(1, options?.page || 1);
    const limit = Math.min(200, Math.max(1, options?.limit || 25));
    const sortBy = options?.sortBy && PatientsService.SORTABLE_FIELDS.has(options.sortBy)
      ? options.sortBy
      : 'createdAt';
    const sortDir = options?.sortDir === 'asc' ? 'asc' : 'desc';

    const search = options?.search?.trim();
    const where: any = { clinicId }; // Tenant isolation query (redundant check but safe)
    if (search) {
      const orConditions: any[] = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
      const numericSearch = search.replace(/\D/g, '');
      if (numericSearch && /^\d+$/.test(numericSearch)) {
        orConditions.push({ fileNo: parseInt(numericSearch, 10) });
      }
      where.OR = orConditions;
    }

    const [total, patients] = await tenantDb.$transaction([
      tenantDb.patient.count({ where }),
      tenantDb.patient.findMany({
        where,
        orderBy: { [sortBy]: sortDir },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          treatmentPlans: {
            select: { status: true, items: { select: { status: true } } },
          },
        },
      }),
    ]);

    const data = patients.map(patient => {
      if (patient.nationalId) {
        patient.nationalId = EncryptionUtil.decrypt(patient.nationalId) || patient.nationalId;
      }
      const { treatmentPlans, ...rest } = patient;
      return { ...rest, status: computePatientStatus(treatmentPlans) };
    });

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(id: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    // Fetch patient inside the isolated tenant DB
    const patient = await tenantDb.patient.findFirst({
      where: { id, clinicId },
      include: {
        treatmentPlans: { include: { items: { include: { tariff: { include: { masterTreatment: true } } } } } },
        appointments: true,
        payments: true,
        documents: true,
      }
    });

    if (!patient) {
      throw new NotFoundException(`Bu ID'ye (${id}) sahip hasta bulunamadı veya kliniğinize ait değil.`);
    }

    if (patient.nationalId) {
      patient.nationalId = EncryptionUtil.decrypt(patient.nationalId) || patient.nationalId;
    }

    return { ...patient, status: computePatientStatus(patient.treatmentPlans) };
  }

  /**
   * Yeni doküman ekler
   */
  async addDocument(patientId: string, clinicId: string, dto: CreatePatientDocumentDto, userId?: string) {
    const prisma = await this.tenantPrisma.getClient();
    
    // Hasta kontrolü
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');

    return prisma.patientDocument.create({
      data: {
        ...dto,
        patientId,
        clinicId,
        uploadedBy: userId,
      }
    });
  }

  /**
   * Yüklenen dosyadan doküman oluşturur
   */
  async addDocumentWithFile(
    patientId: string,
    clinicId: string,
    file: any,
    dto: UploadPatientDocumentDto,
    userId?: string,
  ) {
    if (!file) throw new BadRequestException('Dosya bulunamadı.');

    const prisma = await this.tenantPrisma.getClient();

    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');

    return prisma.patientDocument.create({
      data: {
        name: dto.name || file.originalname,
        fileType: file.mimetype || 'application/octet-stream',
        category: dto.category || 'OTHER',
        fileUrl: `/uploads/patient-documents/${file.filename}`,
        fileSize: file.size,
        description: dto.description,
        patientId,
        clinicId,
        uploadedBy: userId,
      },
    });
  }

  /**
   * Doküman siler
   */
  async deleteDocument(docId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    return prisma.patientDocument.deleteMany({
      where: { id: docId, clinicId }
    });
  }

  async updatePhoto(patientId: string, clinicId: string, file: any) {
    if (!file) throw new BadRequestException('Fotoğraf bulunamadı.');
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');

    return prisma.patient.update({
      where: { id: patientId },
      data: { photoUrl: `/uploads/patient-photos/${file.filename}` },
    });
  }

  async deletePhoto(patientId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');

    return prisma.patient.update({
      where: { id: patientId },
      data: { photoUrl: null },
    });
  }

  /**
   * Onam formundan OCR ile bilgi okuma
   */
  async ocrConsentForm(patientId: string, clinicId: string, file: any) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');

    const fileBuffer = file ? file.buffer : Buffer.from('mock');
    const fileName = file ? file.originalname : 'consent_form.pdf';

    const ocrResult = await this.ocrService.processConsentForm(fileBuffer, fileName);

    // If signed, we can log it in consentLogs
    if (ocrResult.signed && ocrResult.documentType !== 'UNKNOWN') {
      await prisma.consentLog.create({
        data: {
          clinicId,
          patientId,
          consentType: ocrResult.documentType,
          isGranted: true,
          ipAddress: '127.0.0.1',
          userAgent: 'Pulpax OCR Engine v1.0',
        },
      });
    }

    return ocrResult;
  }

  async update(id: string, data: UpdatePatientDto, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');

    const updateData: any = {};
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.lastName !== undefined) updateData.lastName = data.lastName;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.countryCode !== undefined) updateData.countryCode = data.countryCode;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.district !== undefined) updateData.district = data.district;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.emergencyName !== undefined) updateData.emergencyName = data.emergencyName;
    if (data.emergencyPhone !== undefined) updateData.emergencyPhone = data.emergencyPhone;
    if (data.emergencyRelation !== undefined) updateData.emergencyRelation = data.emergencyRelation;
    if (data.bloodGroup !== undefined) updateData.bloodGroup = data.bloodGroup;
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate ? new Date(data.birthDate).toISOString() : null;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.nationality !== undefined) updateData.nationality = data.nationality;
    if (data.tariff !== undefined) updateData.tariff = data.tariff;
    if (data.institution !== undefined) updateData.institution = data.institution;
    if (data.group !== undefined) updateData.group = data.group;
    if (data.family !== undefined) updateData.family = data.family;
    if (data.referral !== undefined) updateData.referral = data.referral;
    if (data.assignedDoctor !== undefined) updateData.assignedDoctor = data.assignedDoctor;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.smsConsent !== undefined) updateData.smsConsent = data.smsConsent;
    if (data.kvkkConsent !== undefined) updateData.kvkkConsent = data.kvkkConsent;
    if (data.treatmentConsent !== undefined) updateData.treatmentConsent = data.treatmentConsent;
    
    if (data.nationalId !== undefined) {
      const resolvedNationality = data.nationality ?? patient.nationality;
      const isTurkish = (resolvedNationality ?? 'Türkiye') === 'Türkiye';
      if (data.nationalId && isTurkish && !isValidTcKimlikNo(data.nationalId)) {
        throw new BadRequestException('Geçersiz TC Kimlik Numarası');
      }
      updateData.nationalId = data.nationalId ? EncryptionUtil.encrypt(data.nationalId) : null;
    }
    if (data.detailedAnamnesis !== undefined) {
      updateData.detailedAnamnesis = data.detailedAnamnesis;
    }

    const { count } = await prisma.patient.updateMany({
      where: { id, clinicId },
      data: updateData,
    });
    if (count === 0) throw new NotFoundException('Hasta bulunamadı.');

    const updated = await prisma.patient.findFirst({ where: { id, clinicId } });

    if (updated.nationalId) {
      updated.nationalId = EncryptionUtil.decrypt(updated.nationalId) || updated.nationalId;
    }
    return updated;
  }

  // ─── İmplant CRUD ──────────────────────────────────────────────────────────

  async getImplants(patientId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');
    return prisma.implantRecord.findMany({
      where: { patientId },
      orderBy: { implantDate: 'desc' },
    });
  }

  async createImplant(patientId: string, dto: CreateImplantDto, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');
    return prisma.implantRecord.create({
      data: {
        patientId,
        toothNo: dto.toothNo,
        brand: dto.brand,
        implantDate: new Date(dto.implantDate),
        implantLotNo: dto.implantLotNo || '',
        implantSerialNo: dto.implantSerialNo || '',
        abutmentDate: dto.abutmentDate ? new Date(dto.abutmentDate) : null,
        abutmentLotNo: dto.abutmentLotNo || null,
        abutmentSerialNo: dto.abutmentSerialNo || null,
        status: dto.status || 'BASARILI',
      },
    });
  }

  async updateImplant(implantId: string, dto: UpdateImplantDto, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const existing = await prisma.implantRecord.findFirst({ where: { id: implantId, patient: { clinicId } } });
    if (!existing) throw new NotFoundException('İmplant kaydı bulunamadı');
    return prisma.implantRecord.update({
      where: { id: implantId },
      data: {
        toothNo: dto.toothNo,
        brand: dto.brand,
        implantDate: new Date(dto.implantDate),
        implantLotNo: dto.implantLotNo || '',
        implantSerialNo: dto.implantSerialNo || '',
        abutmentDate: dto.abutmentDate ? new Date(dto.abutmentDate) : null,
        abutmentLotNo: dto.abutmentLotNo || null,
        abutmentSerialNo: dto.abutmentSerialNo || null,
        status: dto.status || existing.status,
      },
    });
  }

  async deleteImplant(implantId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const existing = await prisma.implantRecord.findFirst({ where: { id: implantId, patient: { clinicId } } });
    if (!existing) throw new NotFoundException('İmplant kaydı bulunamadı');
    await prisma.implantRecord.delete({ where: { id: implantId } });
    return { success: true };
  }

  // ─── Diyagnoz CRUD ─────────────────────────────────────────────────────────

  async getDiagnoses(patientId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');
    return prisma.toothDiagnosis.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createDiagnoses(patientId: string, dto: CreateDiagnosisDto, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');
    await prisma.toothDiagnosis.createMany({
      data: dto.toothNums.map((toothNum) => ({
        patientId,
        toothNum,
        diagId: dto.diagId,
        diagName: dto.diagName,
        diagIcd: dto.diagIcd || null,
        diagCategory: dto.diagCategory,
        doctorId: dto.doctorId || null,
      })),
    });
    return prisma.toothDiagnosis.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDiagnosis(diagnosisId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const existing = await prisma.toothDiagnosis.findFirst({ where: { id: diagnosisId, patient: { clinicId } } });
    if (!existing) throw new NotFoundException('Diyagnoz kaydı bulunamadı');
    await prisma.toothDiagnosis.delete({ where: { id: diagnosisId } });
    return { success: true };
  }

  // ─── Reçete CRUD ───────────────────────────────────────────────────────────

  async getPrescriptions(patientId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');
    return prisma.patientPrescription.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createPrescription(patientId: string, dto: CreatePrescriptionDto, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');
    const year = new Date().getFullYear();
    const uniqueId = crypto.randomBytes(3).toString('hex').toUpperCase();
    const protocolNo = `${year}-${patientId.substring(0, 4).toUpperCase()}-${uniqueId}`;

    return prisma.patientPrescription.create({
      data: {
        patientId,
        protocolNo,
        date: new Date(dto.date),
        doctor: dto.doctor,
        drugs: dto.drugs,
      },
    });
  }

  async deletePrescription(prescriptionId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const existing = await prisma.patientPrescription.findFirst({ where: { id: prescriptionId, patient: { clinicId } } });
    if (!existing) throw new NotFoundException('Reçete bulunamadı');
    await prisma.patientPrescription.delete({ where: { id: prescriptionId } });
    return { success: true };
  }

  // --- Notlar (Clinical Notes) ---

  async getNotes(patientId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');
    return prisma.patientNote.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createNote(patientId: string, dto: CreateNoteDto, clinicId: string, userId?: string) {
    const prisma = await this.tenantPrisma.getClient();
    const patient = await prisma.patient.findFirst({ where: { id: patientId, clinicId } });
    if (!patient) throw new NotFoundException('Hasta bulunamadı.');

    let author = 'Sistem';
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });
      if (user) author = `${user.firstName} ${user.lastName}`;
    }

    return prisma.patientNote.create({
      data: {
        patientId,
        type: dto.type || 'CLINICAL',
        content: dto.content,
        author,
      },
    });
  }

  async deleteNote(noteId: string, clinicId: string) {
    const prisma = await this.tenantPrisma.getClient();
    const existing = await prisma.patientNote.findFirst({ where: { id: noteId, patient: { clinicId } } });
    if (!existing) throw new NotFoundException('Not bulunamadı');
    await prisma.patientNote.delete({ where: { id: noteId } });
    return { success: true };
  }

  // --- Audit Logs ---

  async getLogs(id: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    // Alan bazlı değişiklikleri tespit edebilmek için kronolojik (eskiden yeniye) sırayla işleriz.
    const logs = await tenantDb.auditLog.findMany({
      where: { entity: 'patients', entityId: id, clinicId },
      orderBy: { createdAt: 'asc' },
    });

    const userIds = logs
      .map((l) => l.userId)
      .filter((v, i, arr): v is string => !!v && arr.indexOf(v) === i);
    const users = userIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const isEmpty = (v: any) => v === undefined || v === null || v === '';
    // Formlar (ör. Genel Bilgiler sekmesi) her kayıtta tüm alanları gönderdiği için
    // ham payload anahtarları "değişen alan" anlamına gelmez; önceki durumla kıyaslayarak
    // gerçekten değişen alanları belirleriz.
    const previousState: Record<string, any> = {};

    const entries = logs.map((log) => {
      const method = log.action?.split(' ')[0] || '';
      const op = method === 'POST' ? 'ADD' : method === 'DELETE' ? 'DELETE' : 'UPDATE';
      const user = log.userId ? userMap.get(log.userId) : undefined;
      const userLabel = user
        ? `${user.firstName} ${user.lastName} (${ROLE_LABEL[user.role] || user.role})`
        : 'Sistem';

      let payload: Record<string, any> = {};
      if (log.details) {
        try {
          payload = JSON.parse(log.details);
        } catch {
          payload = {};
        }
      }

      const changes: { field: string; type: 'ADDED' | 'UPDATED' | 'REMOVED'; value?: any; masked?: boolean }[] = [];

      if (op === 'ADD') {
        for (const [key, value] of Object.entries(payload)) {
          if (isEmpty(value)) continue;
          const masked = value === '***MASKED***';
          changes.push({ field: key, type: 'ADDED', value: masked ? undefined : value, masked });
          previousState[key] = value;
        }
      } else if (op === 'UPDATE') {
        for (const [key, value] of Object.entries(payload)) {
          const masked = value === '***MASKED***';
          if (masked) {
            changes.push({ field: key, type: 'UPDATED', masked: true });
            previousState[key] = value;
            continue;
          }

          const prev = previousState[key];
          const prevEmpty = isEmpty(prev);
          const valueEmpty = isEmpty(value);

          if (prevEmpty && !valueEmpty) {
            changes.push({ field: key, type: 'ADDED', value });
          } else if (!prevEmpty && valueEmpty) {
            changes.push({ field: key, type: 'REMOVED' });
          } else if (!valueEmpty && JSON.stringify(prev) !== JSON.stringify(value)) {
            changes.push({ field: key, type: 'UPDATED', value });
          }
          previousState[key] = value;
        }
      }

      const module = changes.length === 1 && changes[0].field === 'detailedAnamnesis'
        ? 'Anamnez'
        : 'Hasta Bilgisi';

      return {
        id: log.id,
        at: log.createdAt,
        user: userLabel,
        op,
        module,
        changes,
      };
    });

    // En yeni kayıt en üstte gösterilir.
    return entries.reverse();
  }
}
