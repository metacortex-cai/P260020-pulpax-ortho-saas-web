import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * En güncel kurları veritabanından getirir.
   */
  async getLatestRates() {
    // Önce en son kaydedilmiş tarihi bul (bugün veya en son tatil öncesi iş günü)
    const latestRecord = await this.prisma.exchangeRate.findFirst({
      orderBy: { rateDate: 'desc' },
      select: { rateDate: true }
    });

    if (!latestRecord) {
      return [];
    }

    return this.prisma.exchangeRate.findMany({
      where: { rateDate: latestRecord.rateDate },
      orderBy: { currencyCode: 'asc' }
    });
  }

  /**
   * Belirli bir tarih ve para birimi için kuru getirir.
   */
  async getRate(currencyCode: string, date: Date) {
    // 1. İstenen tarihteki kuru ara
    const rate = await this.prisma.exchangeRate.findUnique({
      where: {
        currencyCode_rateDate: {
          currencyCode,
          rateDate: date
        }
      }
    });

    if (rate) return rate;

    // 2. Eğer o gün kur yoksa (tatil vs.), geçmişteki en yakın kuru bul
    return this.prisma.exchangeRate.findFirst({
      where: {
        currencyCode,
        rateDate: { lt: date }
      },
      orderBy: { rateDate: 'desc' }
    });
  }
}
