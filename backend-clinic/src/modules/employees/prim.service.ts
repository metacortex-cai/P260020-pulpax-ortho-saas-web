import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { Prisma } from '@prisma/client';

export interface PrimDistributionDto {
  clinicId: string;
  employeeId: string;
  treatmentItemId: string;
  distributionId: string;
  amount: number; // Bu dağıtımda ödenen tutar (tam ücret değil)
}

function toPeriod(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * ADR-003 Faz 3: Hekim Prim Sistemi v2.
 * Prim artık tedavi tamamlama anında tam ücret üzerinden değil, ödeme
 * dağıtıldıkça (PaymentDistribution) ve yalnızca kalem COMPLETED ise,
 * ödenen tutar üzerinden hesaplanır (bkz. prim sistemi.md §4).
 */
@Injectable()
export class PrimService {
  private readonly logger = new Logger(PrimService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /**
   * Appointment/TreatmentItem/PaymentDistribution olayları bir Doctor.id taşır
   * (Employee ile Doctor ayrı modeller olarak yaşıyor — bkz. HR restorasyon
   * planı, Employee.doctorId köprüsü); prim hesaplaması ise Employee.id
   * bekler. Eşleşen bir Employee (İK kaydı) yoksa null döner.
   */
  async resolveEmployeeIdByDoctorId(doctorId: string): Promise<string | null> {
    const client = await this.tenantPrisma.getClient();
    const employee = await client.employee.findFirst({ where: { doctorId }, select: { id: true } });
    return employee?.id ?? null;
  }

  /**
   * Aktif çalışan sözleşmesini bulur.
   */
  async getActiveContract(clinicId: string, employeeId: string) {
    const today = new Date();
    const client = await this.tenantPrisma.getClient();
    return client.employeeContract.findFirst({
      where: {
        clinicId,
        employeeId,
        validFrom: { lte: today },
        OR: [{ validUntil: null }, { validUntil: { gte: today } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async resolveRate(contract: any, category: string | null | undefined): Promise<number> {
    if (contract.rateMode !== 'CATEGORY' || !category) {
      return Number(contract.rate);
    }
    const client = await this.tenantPrisma.getClient();
    const categoryRate = await client.employeeContractCategoryRate.findUnique({
      where: { contractId_category: { contractId: contract.id, category } },
    });
    return categoryRate ? Number(categoryRate.rate) : Number(contract.rate);
  }

  private async updateTargetLedger(clinicId: string, employeeId: string, contract: any, period: string, revenueAmount: number) {
    const client = await this.tenantPrisma.getClient();
    const targetAmount = Number(contract.targetAmount || 0);
    await client.doctorTargetLedger.upsert({
      where: { clinicId_employeeId_period: { clinicId, employeeId, period } },
      update: { actualRevenue: { increment: revenueAmount } },
      create: { clinicId, employeeId, period, targetAmount, actualRevenue: revenueAmount },
    });
  }

  /**
   * Bir ödeme dağıtımı için prim hesaplar. Yalnızca ilgili tedavi kalemi
   * COMPLETED statüsündeyse prim üretir; aksi halde bu tutar avans/bekleyen
   * ödeme sayılır ve kalem tamamlandığında `reconcileCompletedItem` ile
   * geriye dönük yakalanır. İdempotenttir: aynı dağıtım (Model 1/2/3) veya
   * aynı kalem (Model-4) için asla ikinci kez prim üretmez.
   */
  async calculateForDistribution(dto: PrimDistributionDto) {
    const client = await this.tenantPrisma.getClient();

    const contract = await this.getActiveContract(dto.clinicId, dto.employeeId);
    if (!contract) {
      this.logger.warn(`Prim atlandı: çalışan (${dto.employeeId}) için aktif sözleşme yok.`);
      return null;
    }

    const treatmentItem = await client.treatmentItem.findUnique({
      where: { id: dto.treatmentItemId },
      include: { tariff: { include: { masterTreatment: true } } },
    });
    if (!treatmentItem || treatmentItem.status !== 'COMPLETED') {
      return null; // Henüz tamamlanmamış — bu tutar avans/bekleyen ödeme.
    }

    // Model-4: idempotency kalem bazlıdır (kalem başına en fazla bir kez sabit ücret).
    // Diğer modellerde her ödeme dağıtımı prime orantılı katkı yapar.
    const idempotencyKey =
      contract.type === 'MODEL_4'
        ? `prim_model4_${dto.treatmentItemId}_${contract.id}`
        : `prim_dist_${dto.distributionId}`;

    const existing = await client.primRecord.findUnique({ where: { idempotencyKey } });
    if (existing) {
      return existing;
    }

    const category = treatmentItem.tariff?.masterTreatment?.category ?? null;
    let primAmount = new Prisma.Decimal(0);

    switch (contract.type) {
      case 'MODEL_1':
      case 'MODEL_2':
      case 'MODEL_3': {
        // Not: Model-2/3'teki laboratuvar/tedavi maliyeti düşümü işlem anında değil,
        // aylık mutabakat/rapor katmanında netleştirilir (bkz. ADR-003 §3). Burada
        // kaydedilen tutar brüttür.
        const rate = await this.resolveRate(contract, category);
        primAmount = new Prisma.Decimal(dto.amount * (rate / 100));
        break;
      }
      case 'MODEL_4': {
        const itemFee = await client.employeeContractItemFee.findUnique({
          where: {
            contractId_masterTreatmentId: {
              contractId: contract.id,
              masterTreatmentId: treatmentItem.tariff.masterTreatmentId,
            },
          },
        });
        primAmount = new Prisma.Decimal(itemFee ? Number(itemFee.fixedFee) : 0);
        break;
      }
      default:
        this.logger.warn(`Bilinmeyen prim modeli: ${contract.type}`);
        return null;
    }

    const period = toPeriod(new Date());
    const status = contract.targetEnabled ? 'PROVISIONAL' : 'CONFIRMED';

    const record = await client.primRecord.create({
      data: {
        clinicId: dto.clinicId,
        employeeId: dto.employeeId,
        treatmentItemId: dto.treatmentItemId,
        contractId: contract.id,
        amount: primAmount,
        period,
        status,
        paymentDistributionId: dto.distributionId,
        idempotencyKey,
      },
    });

    if (contract.targetEnabled) {
      await this.updateTargetLedger(dto.clinicId, dto.employeeId, contract, period, dto.amount);
    }

    return record;
  }

  /**
   * Bir tedavi kalemi COMPLETED olduğunda, o kaleme daha önce (kalem henüz
   * tamamlanmamışken) düşmüş ödeme dağıtımlarını geriye dönük tarar ve
   * primlerini hesaplar.
   */
  async reconcileCompletedItem(clinicId: string, employeeId: string, treatmentItemId: string) {
    const client = await this.tenantPrisma.getClient();
    const distributions = await client.paymentDistribution.findMany({ where: { treatmentItemId } });

    const results = [];
    for (const dist of distributions) {
      const record = await this.calculateForDistribution({
        clinicId,
        employeeId,
        treatmentItemId,
        distributionId: dist.id,
        amount: Number(dist.amount),
      });
      if (record) results.push(record);
    }
    return results;
  }

  async findByEmployee(clinicId: string, employeeId: string) {
    const client = await this.tenantPrisma.getClient();
    return client.primRecord.findMany({
      where: { clinicId, employeeId },
      orderBy: { calculatedAt: 'desc' },
    });
  }

  /**
   * Prim raporu (ADR-003 §11.1/§11.2): zaman ve kişi filtresiyle prim dökümü.
   * Model-3 sözleşmelerde tedavi maliyeti düşümü burada (rapor katmanında)
   * netleştirilir — PrimRecord.amount her zaman brüttür. Model-2/3'teki
   * laboratuvar maliyeti düşümü, Lab modülü kapsam dışı kaldığı için (bkz.
   * HR restorasyon planı) burada hesaplanmıyor.
   */
  async getReport(clinicId: string, filters: { employeeId?: string; from?: string; to?: string }) {
    const client = await this.tenantPrisma.getClient();

    const where: any = { clinicId };
    if (filters.employeeId) where.employeeId = filters.employeeId;
    if (filters.from || filters.to) {
      where.calculatedAt = {};
      if (filters.from) where.calculatedAt.gte = new Date(filters.from);
      if (filters.to) where.calculatedAt.lte = new Date(filters.to);
    }

    const records = await client.primRecord.findMany({
      where,
      include: { treatmentItem: { include: { tariff: true } }, contract: true },
      orderBy: { calculatedAt: 'desc' },
    });

    const byEmployee = new Map<string, { employeeId: string; contract: any; confirmed: number; provisional: number; voided: number; records: any[] }>();
    for (const rec of records) {
      if (!byEmployee.has(rec.employeeId)) {
        byEmployee.set(rec.employeeId, { employeeId: rec.employeeId, contract: rec.contract, confirmed: 0, provisional: 0, voided: 0, records: [] });
      }
      const bucket = byEmployee.get(rec.employeeId)!;
      const amount = Number(rec.amount);
      if (rec.status === 'CONFIRMED') bucket.confirmed += amount;
      else if (rec.status === 'PROVISIONAL') bucket.provisional += amount;
      else if (rec.status === 'VOID') bucket.voided += amount;
      bucket.records.push(rec);
    }

    const result = [];
    for (const bucket of byEmployee.values()) {
      let treatmentCostDeduction = 0;

      if (bucket.contract && bucket.contract.type === 'MODEL_3') {
        treatmentCostDeduction = bucket.records
          .filter((r) => r.status === 'CONFIRMED')
          .reduce((sum, r) => sum + Number(r.treatmentItem?.tariff?.cost || 0), 0);
      }

      result.push({
        employeeId: bucket.employeeId,
        contractType: bucket.contract?.type ?? null,
        grossConfirmed: bucket.confirmed,
        provisional: bucket.provisional,
        voided: bucket.voided,
        treatmentCostDeduction,
        netConfirmed: bucket.confirmed - treatmentCostDeduction,
      });
    }

    return result;
  }
}
