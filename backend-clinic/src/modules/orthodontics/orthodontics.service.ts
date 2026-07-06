import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import {
  CreateOrthoCaseDto,
  UpdateOrthoCaseDto,
  CreateOrthoDiagnosisDto,
  CreateOrthoRecordDto,
} from './dto/ortho-case.dto';
import {
  CreateOrthoTrackDto,
  UpdateOrthoTrackDto,
  CreateAdjustmentVisitDto,
  CreateActivationLogDto,
  CreateAlignerSetDto,
} from './dto/ortho-track.dto';
import {
  CreateMiniScrewDto,
  UpdateMiniScrewDto,
  CreateGrowthAssessmentDto,
  CreateRetentionPlanDto,
  UpdateRetentionPlanDto,
} from './dto/ortho-extras.dto';

// Vaka detayında her zaman birlikte dönen ilişki ağacı
const CASE_INCLUDE = {
  doctor: { select: { id: true, firstName: true, lastName: true } },
  diagnoses: { orderBy: { examDate: 'desc' as const } },
  recordSets: { orderBy: { takenAt: 'desc' as const } },
  tracks: {
    orderBy: { startDate: 'desc' as const },
    include: {
      treatmentItem: {
        include: { tariff: { include: { masterTreatment: true } } },
      },
      adjustmentVisits: { orderBy: { visitDate: 'desc' as const } },
      activationLogs: { orderBy: { date: 'desc' as const } },
      alignerSets: { orderBy: { setNo: 'desc' as const } },
    },
  },
  miniScrews: {
    orderBy: { placementDate: 'desc' as const },
    include: {
      treatmentItem: {
        include: { tariff: { include: { masterTreatment: true } } },
      },
    },
  },
  growthAssessments: { orderBy: { xrayDate: 'desc' as const } },
  retentionPlans: { orderBy: { createdAt: 'desc' as const } },
};

@Injectable()
export class OrthodonticsService {
  private readonly logger = new Logger(OrthodonticsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  // ── Vaka (OrthoCase) ──────────────────────────────────────────────────

  async findCasesByPatient(clinicId: string, patientId: string) {
    if (!patientId) {
      throw new BadRequestException('patientId zorunludur.');
    }
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.orthoCase.findMany({
      where: { clinicId, patientId },
      include: CASE_INCLUDE,
      orderBy: { startDate: 'desc' },
    });
  }

  async findCase(id: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const orthoCase = await tenantDb.orthoCase.findFirst({
      where: { id, clinicId },
      include: CASE_INCLUDE,
    });
    if (!orthoCase) {
      throw new NotFoundException('Ortodonti vakası bulunamadı veya bu kliniğe ait değil.');
    }
    return orthoCase;
  }

  async createCase(dto: CreateOrthoCaseDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();

    const patient = await tenantDb.patient.findFirst({
      where: { id: dto.patientId, clinicId },
    });
    if (!patient) {
      throw new BadRequestException('Hasta bulunamadı veya bu kliniğe ait değil.');
    }

    const created = await tenantDb.orthoCase.create({
      data: {
        clinicId,
        patientId: dto.patientId,
        doctorId: dto.doctorId,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        complaint: dto.complaint,
        expectation: dto.expectation,
        notes: dto.notes,
      },
      include: CASE_INCLUDE,
    });

    this.logger.log(`Ortodonti vakası açıldı: ${created.id} | Hasta: ${dto.patientId}`);
    return created;
  }

  async updateCase(id: string, dto: UpdateOrthoCaseDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertCase(id, clinicId);

    return tenantDb.orthoCase.update({
      where: { id },
      data: {
        status: dto.status,
        doctorId: dto.doctorId,
        complaint: dto.complaint,
        expectation: dto.expectation,
        notes: dto.notes,
      },
      include: CASE_INCLUDE,
    });
  }

  // ── Tanı (OrthoDiagnosis) ─────────────────────────────────────────────

  async addDiagnosis(caseId: string, dto: CreateOrthoDiagnosisDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertCase(caseId, clinicId);

    return tenantDb.orthoDiagnosis.create({
      data: {
        caseId,
        examDate: dto.examDate ? new Date(dto.examDate) : undefined,
        doctorId: dto.doctorId,
        skeletalClass: dto.skeletalClass,
        profileType: dto.profileType,
        overjet: dto.overjet,
        overbite: dto.overbite,
        crowding: dto.crowding,
        openBite: dto.openBite,
        deepBite: dto.deepBite,
        crossbite: dto.crossbite,
        midlineDeviation: dto.midlineDeviation,
        tmjAssessment: dto.tmjAssessment,
        cephalometricValues: dto.cephalometricValues,
        boltonAnalysis: dto.boltonAnalysis,
        haysNanceAnalysis: dto.haysNanceAnalysis,
        iconScore: dto.iconScore,
        iconDetails: dto.iconDetails,
        notes: dto.notes,
      },
    });
  }

  async deleteDiagnosis(diagnosisId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const diagnosis = await tenantDb.orthoDiagnosis.findFirst({
      where: { id: diagnosisId, case: { clinicId } },
    });
    if (!diagnosis) {
      throw new NotFoundException('Tanı kaydı bulunamadı veya bu kliniğe ait değil.');
    }
    await tenantDb.orthoDiagnosis.delete({ where: { id: diagnosisId } });
    return { success: true };
  }

  // ── Kayıt Seti (OrthoRecordSet) ───────────────────────────────────────

  async addRecord(caseId: string, dto: CreateOrthoRecordDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertCase(caseId, clinicId);

    return tenantDb.orthoRecordSet.create({
      data: {
        caseId,
        recordType: dto.recordType,
        phase: dto.phase,
        name: dto.name,
        fileUrl: dto.fileUrl,
        fileType: dto.fileType,
        fileSize: dto.fileSize,
        description: dto.description,
        takenAt: dto.takenAt ? new Date(dto.takenAt) : undefined,
      },
    });
  }

  async deleteRecord(recordId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const record = await tenantDb.orthoRecordSet.findFirst({
      where: { id: recordId, case: { clinicId } },
    });
    if (!record) {
      throw new NotFoundException('Kayıt bulunamadı veya bu kliniğe ait değil.');
    }
    await tenantDb.orthoRecordSet.delete({ where: { id: recordId } });
    return { success: true };
  }

  // ── Tedavi Track'i (OrthoTreatmentTrack) ──────────────────────────────

  /**
   * Vaka içinde yeni bir tedavi track'i başlatır.
   * tariffId verilirse aynı transaction içinde bir DRAFT TreatmentPlan +
   * TreatmentItem oluşturulur; track fiyat/kademe bilgisini bu kalem
   * üzerinden taşır (ayrı bir fiyatlandırma sistemi yoktur, mevcut finans
   * akışı — sözleşme, FIFO tahsilat, prim — aynen çalışır).
   */
  async createTrack(caseId: string, dto: CreateOrthoTrackDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const orthoCase = await this.assertCase(caseId, clinicId);

    return tenantDb.$transaction(async (tx) => {
      let treatmentItemId: string | undefined;

      if (dto.tariffId) {
        if (!dto.doctorId) {
          throw new BadRequestException('Tarifeli track için doktor seçimi zorunludur.');
        }

        const tariff = await tx.tariff.findFirst({
          where: { id: dto.tariffId, clinicId },
          include: { masterTreatment: true },
        });
        if (!tariff) {
          throw new BadRequestException('Tarife bulunamadı veya bu kliniğe ait değil.');
        }

        const price = dto.price ?? Number(tariff.price);

        const plan = await tx.treatmentPlan.create({
          data: {
            clinicId,
            patientId: orthoCase.patientId,
            status: 'DRAFT',
            totalPrice: price,
            description: `Ortodonti: ${tariff.masterTreatment.name}`,
            items: {
              create: [
                {
                  tariffId: tariff.id,
                  doctorId: dto.doctorId,
                  price,
                  status: 'PENDING',
                },
              ],
            },
          },
          include: { items: true },
        });
        treatmentItemId = plan.items[0].id;

        this.logger.log(
          `Ortodonti track için tedavi planı oluşturuldu (DRAFT): ${plan.id} | Tarife: ${tariff.masterTreatment.name} | Tutar: ${price}`,
        );
      }

      return tx.orthoTreatmentTrack.create({
        data: {
          caseId,
          trackType: dto.trackType,
          treatmentItemId,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          applianceInfo: dto.applianceInfo,
          notes: dto.notes,
        },
        include: {
          treatmentItem: {
            include: { tariff: { include: { masterTreatment: true } } },
          },
        },
      });
    });
  }

  async updateTrack(trackId: string, dto: UpdateOrthoTrackDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertTrack(trackId, clinicId);

    return tenantDb.orthoTreatmentTrack.update({
      where: { id: trackId },
      data: {
        status: dto.status,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        applianceInfo: dto.applianceInfo,
        notes: dto.notes,
      },
    });
  }

  // ── Faz 05 ilerleme kayıtları ─────────────────────────────────────────

  async addAdjustmentVisit(trackId: string, dto: CreateAdjustmentVisitDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertTrack(trackId, clinicId);

    return tenantDb.orthoAdjustmentVisit.create({
      data: {
        trackId,
        visitDate: dto.visitDate ? new Date(dto.visitDate) : undefined,
        appointmentId: dto.appointmentId,
        doctorId: dto.doctorId,
        wireSize: dto.wireSize,
        elasticType: dto.elasticType,
        iprDone: dto.iprDone ?? false,
        iprNote: dto.iprNote,
        complianceNote: dto.complianceNote,
        nextVisitWeeks: dto.nextVisitWeeks,
        isEmergency: dto.isEmergency ?? false,
        note: dto.note,
      },
    });
  }

  async deleteAdjustmentVisit(visitId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const visit = await tenantDb.orthoAdjustmentVisit.findFirst({
      where: { id: visitId, track: { case: { clinicId } } },
    });
    if (!visit) {
      throw new NotFoundException('Ziyaret kaydı bulunamadı veya bu kliniğe ait değil.');
    }
    await tenantDb.orthoAdjustmentVisit.delete({ where: { id: visitId } });
    return { success: true };
  }

  async addActivationLog(trackId: string, dto: CreateActivationLogDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertTrack(trackId, clinicId);

    return tenantDb.orthoActivationLog.create({
      data: {
        trackId,
        date: dto.date ? new Date(dto.date) : undefined,
        logType: dto.logType,
        value: dto.value,
        unit: dto.unit,
        note: dto.note,
      },
    });
  }

  async deleteActivationLog(logId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const log = await tenantDb.orthoActivationLog.findFirst({
      where: { id: logId, track: { case: { clinicId } } },
    });
    if (!log) {
      throw new NotFoundException('Aktivasyon kaydı bulunamadı veya bu kliniğe ait değil.');
    }
    await tenantDb.orthoActivationLog.delete({ where: { id: logId } });
    return { success: true };
  }

  async addAlignerSet(trackId: string, dto: CreateAlignerSetDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertTrack(trackId, clinicId);

    return tenantDb.orthoAlignerSet.create({
      data: {
        trackId,
        setNo: dto.setNo,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        isRefinement: dto.isRefinement ?? false,
        wearComplianceNote: dto.wearComplianceNote,
      },
    });
  }

  async deleteAlignerSet(setId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const set = await tenantDb.orthoAlignerSet.findFirst({
      where: { id: setId, track: { case: { clinicId } } },
    });
    if (!set) {
      throw new NotFoundException('Plak seti kaydı bulunamadı veya bu kliniğe ait değil.');
    }
    await tenantDb.orthoAlignerSet.delete({ where: { id: setId } });
    return { success: true };
  }

  // ── Mini Vida (OrthoMiniScrewRecord) ──────────────────────────────────

  /**
   * Mini vida kaydı — vida başına faturalanır: tariffId ("Mini Vida (Adet)")
   * verilirse track'teki mantığın aynısıyla DRAFT plan + kalem oluşturulur.
   */
  async addMiniScrew(caseId: string, dto: CreateMiniScrewDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const orthoCase = await this.assertCase(caseId, clinicId);

    return tenantDb.$transaction(async (tx) => {
      let treatmentItemId: string | undefined;

      if (dto.tariffId) {
        if (!dto.doctorId) {
          throw new BadRequestException('Faturalı mini vida için doktor seçimi zorunludur.');
        }

        const tariff = await tx.tariff.findFirst({
          where: { id: dto.tariffId, clinicId },
          include: { masterTreatment: true },
        });
        if (!tariff) {
          throw new BadRequestException('Tarife bulunamadı veya bu kliniğe ait değil.');
        }

        const price = dto.price ?? Number(tariff.price);

        const plan = await tx.treatmentPlan.create({
          data: {
            clinicId,
            patientId: orthoCase.patientId,
            status: 'DRAFT',
            totalPrice: price,
            description: `Ortodonti: ${tariff.masterTreatment.name} (${dto.region})`,
            items: {
              create: [
                {
                  tariffId: tariff.id,
                  doctorId: dto.doctorId,
                  price,
                  status: 'PENDING',
                },
              ],
            },
          },
          include: { items: true },
        });
        treatmentItemId = plan.items[0].id;
      }

      return tx.orthoMiniScrewRecord.create({
        data: {
          caseId,
          treatmentItemId,
          region: dto.region,
          placementDate: dto.placementDate ? new Date(dto.placementDate) : undefined,
          purpose: dto.purpose,
          followUpDates: dto.followUpDates?.map((d) => new Date(d)) ?? [],
          note: dto.note,
        },
      });
    });
  }

  async updateMiniScrew(screwId: string, dto: UpdateMiniScrewDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const screw = await tenantDb.orthoMiniScrewRecord.findFirst({
      where: { id: screwId, case: { clinicId } },
    });
    if (!screw) {
      throw new NotFoundException('Mini vida kaydı bulunamadı veya bu kliniğe ait değil.');
    }

    return tenantDb.orthoMiniScrewRecord.update({
      where: { id: screwId },
      data: {
        status: dto.status,
        removalDate: dto.removalDate ? new Date(dto.removalDate) : undefined,
        followUpDates: dto.followUpDates
          ? dto.followUpDates.map((d) => new Date(d))
          : undefined,
        note: dto.note,
      },
    });
  }

  // ── Büyüme Takibi (OrthoGrowthAssessment) ─────────────────────────────

  async addGrowthAssessment(caseId: string, dto: CreateGrowthAssessmentDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertCase(caseId, clinicId);

    return tenantDb.orthoGrowthAssessment.create({
      data: {
        caseId,
        xrayDate: dto.xrayDate ? new Date(dto.xrayDate) : undefined,
        skeletalAge: dto.skeletalAge,
        growthPhase: dto.growthPhase,
        note: dto.note,
      },
    });
  }

  // ── Retansiyon (OrthoRetentionPlan) ───────────────────────────────────

  async addRetentionPlan(caseId: string, dto: CreateRetentionPlanDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    await this.assertCase(caseId, clinicId);

    return tenantDb.orthoRetentionPlan.create({
      data: {
        caseId,
        retainerType: dto.retainerType,
        archCoverage: dto.archCoverage,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        followUpSchedule: dto.followUpSchedule,
        usageInstruction: dto.usageInstruction,
        note: dto.note,
      },
    });
  }

  async updateRetentionPlan(planId: string, dto: UpdateRetentionPlanDto, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const plan = await tenantDb.orthoRetentionPlan.findFirst({
      where: { id: planId, case: { clinicId } },
    });
    if (!plan) {
      throw new NotFoundException('Retansiyon planı bulunamadı veya bu kliniğe ait değil.');
    }

    return tenantDb.orthoRetentionPlan.update({
      where: { id: planId },
      data: {
        status: dto.status,
        deliveryDate: dto.deliveryDate ? new Date(dto.deliveryDate) : undefined,
        followUpSchedule: dto.followUpSchedule,
        note: dto.note,
      },
    });
  }

  // ── Yardımcılar ───────────────────────────────────────────────────────

  private async assertCase(caseId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const orthoCase = await tenantDb.orthoCase.findFirst({
      where: { id: caseId, clinicId },
    });
    if (!orthoCase) {
      throw new NotFoundException('Ortodonti vakası bulunamadı veya bu kliniğe ait değil.');
    }
    return orthoCase;
  }

  private async assertTrack(trackId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    const track = await tenantDb.orthoTreatmentTrack.findFirst({
      where: { id: trackId, case: { clinicId } },
    });
    if (!track) {
      throw new NotFoundException('Tedavi track kaydı bulunamadı veya bu kliniğe ait değil.');
    }
    return track;
  }
}
