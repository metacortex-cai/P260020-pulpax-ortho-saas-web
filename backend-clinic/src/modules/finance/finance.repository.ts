import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantBaseRepository } from '../../common/database/tenant-base.repository';
@Injectable()
export class FinanceRepository extends TenantBaseRepository<any, any, any> {
  constructor(tenantPrisma: TenantPrismaService) {
    super(tenantPrisma, 'payment');
  }

  /**
   * Hasta bazlı ödeme geçmişini dağılım detaylarıyla birlikte getirir.
   */
  async findByPatient(clinicId: string, patientId: string): Promise<any[]> {
    const delegate = await this.getDelegate();
    return delegate.findMany({
      where: { patientId, patient: { clinicId } },
      include: {
        account: true,
        distributions: {
          include: {
            treatmentItem: {
              include: {
                tariff: { include: { masterTreatment: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * LLD 5.2: Hasta borç/avans bakiyesi özeti.
   */
  async getPatientBalance(clinicId: string, patientId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.patient.findFirst({
      where: { id: patientId, clinicId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        totalDebt: true,
        advance: true,
      },
    });
  }
}
