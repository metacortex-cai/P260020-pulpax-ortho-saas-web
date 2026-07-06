import { Injectable } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantBaseRepository } from '../../common/database/tenant-base.repository';
@Injectable()
export class TreatmentRepository extends TenantBaseRepository<any, any, any> {
  constructor(tenantPrisma: TenantPrismaService) {
    super(tenantPrisma, 'treatmentPlan');
  }

  /**
   * Kliniğe ait tedavi kalemini ilişkili plan bilgisiyle birlikte getirir.
   */
  async findItemWithPlan(itemId: string, clinicId: string) {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.treatmentItem.findFirst({
      where: { id: itemId, plan: { clinicId } },
      include: { plan: true, tariff: true },
    });
  }

  /**
   * Hasta bazlı tüm tedavi planlarını getirir.
   */
  async findByPatient(clinicId: string, patientId: string) {
    const delegate = await this.getDelegate();
    return delegate.findMany({
      where: { clinicId, patientId },
      include: {
        items: {
          include: {
            tariff: { include: { masterTreatment: true } },
            paymentDistributions: true,
          },
        },
        installments: { orderBy: { order: 'asc' } },
      },
      // Eskiden yeniye sıralı: frontend "Plan 1/Plan 2..." etiketlerini bu sıraya göre
      // atıyor; 'desc' kullanılırsa yeni plan oluşturulduğunda eski planların numarası kayardı.
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Tedavi kaleminin durumunu günceller.
   */
  async updateItemStatus(itemId: string, status: string): Promise<any> {
    const tenantDb = await this.tenantPrisma.getClient();
    return tenantDb.treatmentItem.update({
      where: { id: itemId },
      data: { status },
    });
  }
}
