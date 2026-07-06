import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { TcmbAdapterService } from './tcmb.adapter';
import { PrismaService } from '../../prisma/prisma.service';

@Processor('currency-queue')
export class CurrencyProcessor extends WorkerHost {
  private readonly logger = new Logger(CurrencyProcessor.name);

  constructor(
    private readonly tcmbAdapter: TcmbAdapterService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Job işleniyor [${job.id}]: ${job.name}`);

    if (job.name === 'fetch-tcmb-rates') {
      try {
        // 1. Adapter üzerinden TCMB'den çek
        const rates = await this.tcmbAdapter.fetchTodayRates();
        
        if (rates.length === 0) {
          this.logger.warn('TCMB XML kaynağından hiç döviz kuru alınamadı.');
          return;
        }

        // 2. PostgreSQL'e Kaydet (Upsert: Varsa güncelle, yoksa ekle)
        let insertedCount = 0;

        for (const rate of rates) {
          // Prisma upsert unique constraint gerektirir: @@unique([currencyCode, rateDate])
          await this.prisma.exchangeRate.upsert({
            where: {
              currencyCode_rateDate: {
                currencyCode: rate.currencyCode,
                rateDate: rate.rateDate,
              }
            },
            update: {
              buyingRate: rate.buyingRate,
              sellingRate: rate.sellingRate,
              currencyName: rate.currencyName,
              fetchedAt: new Date()
            },
            create: {
              currencyCode: rate.currencyCode,
              currencyName: rate.currencyName,
              buyingRate: rate.buyingRate,
              sellingRate: rate.sellingRate,
              rateDate: rate.rateDate,
              isBusinessDay: true,
            }
          });
          insertedCount++;
        }

        this.logger.log(`TCMB kurları DB'ye başarıyla kaydedildi. Toplam: ${insertedCount}`);
        
        // MVP: Redis set/get işlemleri opsiyonel olarak buraya eklenecek,
        // şimdilik doğrudan veritabanından çekilecek.

      } catch (error) {
        this.logger.error(`TCMB Kur işleme hatası: ${error.message}`, error.stack);
        throw error; // Throwing error will trigger BullMQ retry mechanism
      }
    }
  }
}
