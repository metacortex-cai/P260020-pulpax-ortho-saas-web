import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantContext } from '../../common/context/tenant-context';

/**
 * ADR-003 Faz 3: Hedef bazlı prim sisteminin ay sonu mutabakatı.
 * Hedefe ulaşan hekimlerin o aya ait PROVISIONAL primlerini CONFIRMED yapar;
 * ulaşamayanlarınkini VOID eder ve (targetCarryOver=true ise) farkı bir
 * sonraki ayın hedefine ekler (bkz. prim sistemi.md §7).
 */
@Injectable()
export class PrimReconciliationService {
  private readonly logger = new Logger(PrimReconciliationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  @Cron('0 2 1 * *', { timeZone: 'Europe/Istanbul' })
  async reconcilePreviousMonthForAllClinics(): Promise<void> {
    const period = this.shiftPeriod(this.currentPeriod(), -1);
    const clinics = await this.prisma.clinic.findMany({
      where: { status: { in: ['TRIAL', 'ACTIVE'] }, databaseUrl: { not: null } },
      select: { id: true },
    });

    this.logger.log(`Prim mutabakatı başlatıldı: dönem=${period} | klinik sayısı=${clinics.length}`);

    for (const clinic of clinics) {
      try {
        await TenantContext.run({ clinicId: clinic.id }, () => this.reconcileClinicPeriod(clinic.id, period));
      } catch (err) {
        this.logger.error(`Mutabakat hatası (klinik ${clinic.id}, dönem ${period}): ${err.message}`, err.stack);
      }
    }
  }

  async reconcileClinicPeriod(clinicId: string, period: string) {
    const client = await this.tenantPrisma.getClient();
    const ledgers = await client.doctorTargetLedger.findMany({
      where: { clinicId, period, reconciledAt: null },
    });

    for (const ledger of ledgers) {
      const effectiveTarget = Number(ledger.targetAmount) + Number(ledger.carriedFromPrev);
      const achieved = Number(ledger.actualRevenue) >= effectiveTarget;

      await client.primRecord.updateMany({
        where: { clinicId, employeeId: ledger.employeeId, period, status: 'PROVISIONAL' },
        data: { status: achieved ? 'CONFIRMED' : 'VOID' },
      });

      let carriedToNext = 0;
      if (!achieved) {
        const contract = await client.employeeContract.findFirst({
          where: { clinicId, employeeId: ledger.employeeId },
          orderBy: { createdAt: 'desc' },
        });
        if (contract?.targetCarryOver) {
          carriedToNext = effectiveTarget - Number(ledger.actualRevenue);
        }
      }

      await client.doctorTargetLedger.update({
        where: { id: ledger.id },
        data: { achieved, carriedToNext, reconciledAt: new Date() },
      });

      if (carriedToNext > 0) {
        const nextPeriod = this.shiftPeriod(period, 1);
        await client.doctorTargetLedger.upsert({
          where: { clinicId_employeeId_period: { clinicId, employeeId: ledger.employeeId, period: nextPeriod } },
          update: { carriedFromPrev: carriedToNext, targetAmount: ledger.targetAmount },
          create: {
            clinicId,
            employeeId: ledger.employeeId,
            period: nextPeriod,
            targetAmount: ledger.targetAmount,
            carriedFromPrev: carriedToNext,
          },
        });
      }
    }

    this.logger.log(`Prim mutabakatı tamamlandı: klinik=${clinicId} | dönem=${period} | işlenen=${ledgers.length}`);
    return { period, reconciledCount: ledgers.length };
  }

  private currentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private shiftPeriod(period: string, monthDelta: number): string {
    const [year, month] = period.split('-').map(Number);
    const d = new Date(year, month - 1 + monthDelta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
