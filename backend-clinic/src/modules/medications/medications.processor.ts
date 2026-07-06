import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { IlacRehberiAdapterService } from './ilacrehberi.adapter';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantContext } from '../../common/context/tenant-context';

@Processor('medication-queue')
export class MedicationsProcessor extends WorkerHost {
  private readonly logger = new Logger(MedicationsProcessor.name);

  constructor(
    private readonly ilacRehberiAdapter: IlacRehberiAdapterService,
    private readonly tenantPrisma: TenantPrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Job işleniyor [${job.id}]: ${job.name}`);

    if (job.name === 'sync-medications') {
      const clinicId = job.data?.clinicId;
      if (!clinicId) {
        this.logger.error('Senkronizasyon işlemi için clinicId zorunludur.');
        return;
      }

      try {
        await TenantContext.run({ clinicId }, async () => {
          const client = await this.tenantPrisma.getClient();
          const medications = await this.ilacRehberiAdapter.scrapeMedications();
          
          if (medications.length === 0) {
            this.logger.warn('Web kaynağından ilaç verisi alınamadı.');
            return;
          }

          let processedCount = 0;
          const BATCH_SIZE = 500;
          for (let i = 0; i < medications.length; i += BATCH_SIZE) {
            const batch = medications.slice(i, i + BATCH_SIZE);
            
            await client.$transaction(
              batch.map((med) =>
                client.medication.upsert({
                  where: { barcode: med.barcode },
                  update: {
                    name: med.name,
                    activeSubstance: med.activeSubstance,
                    manufacturer: med.manufacturer,
                    prescriptionType: med.prescriptionType,
                    sgkCovered: med.sgkCovered,
                    lastSyncedAt: new Date()
                  },
                  create: {
                    barcode: med.barcode,
                    name: med.name,
                    activeSubstance: med.activeSubstance,
                    manufacturer: med.manufacturer,
                    prescriptionType: med.prescriptionType,
                    sgkCovered: med.sgkCovered || false,
                  }
                })
              )
            );
            processedCount += batch.length;
          }

          this.logger.log(`Toplam ${processedCount} ilaç başarıyla veritabanına aktarıldı.`);
        });
      } catch (error) {
        this.logger.error(`İlaç senkronizasyon hatası: ${error.message}`, error.stack);
        throw error;
      }
    }
  }
}
