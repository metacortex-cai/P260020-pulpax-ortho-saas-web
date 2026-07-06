import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Injectable()
export class MedicationsService {
  private readonly logger = new Logger(MedicationsService.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  /**
   * İlaç adına veya etken maddeye göre ilaç arar.
   */
  async searchMedications(query: string, limit: number = 20) {
    if (!query || query.length < 2) {
      return [];
    }

    const client = await this.tenantPrisma.getClient();
    return client.medication.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { activeSubstance: { contains: query, mode: 'insensitive' } },
          { barcode: { equals: query } }
        ]
      },
      take: limit,
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Barkoda göre spesifik bir ilacın detayını döner.
   */
  async getByBarcode(barcode: string) {
    const client = await this.tenantPrisma.getClient();
    return client.medication.findUnique({
      where: { barcode }
    });
  }
}
