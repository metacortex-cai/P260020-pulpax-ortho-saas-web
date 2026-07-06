import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as xml2js from 'xml2js';

export interface ExchangeRateDto {
  currencyCode: string;
  currencyName: string;
  buyingRate: number;
  sellingRate: number;
  rateDate: Date;
}

@Injectable()
export class TcmbAdapterService {
  private readonly logger = new Logger(TcmbAdapterService.name);
  private readonly TCMB_URL = 'https://www.tcmb.gov.tr/kurlar/today.xml';

  constructor(private readonly httpService: HttpService) {}

  /**
   * TCMB'den güncel kurları çeker ve parse eder.
   */
  async fetchTodayRates(): Promise<ExchangeRateDto[]> {
    try {
      this.logger.log(`TCMB kurları çekiliyor: ${this.TCMB_URL}`);
      
      const response = await lastValueFrom(
        this.httpService.get(this.TCMB_URL, { timeout: 10000 })
      );

      const xmlData = response.data;
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(xmlData);

      const dateStr = result.Tarih_Date?.['$']?.Date;
      const rateDate = new Date(dateStr); // MM/DD/YYYY formatı gelir
      
      const currencies = result.Tarih_Date?.Currency || [];
      const parsedRates: ExchangeRateDto[] = [];

      // Dizi değilse (tek eleman) diziye çevir
      const currencyList = Array.isArray(currencies) ? currencies : [currencies];

      for (const curr of currencyList) {
        const code = curr['$']?.CurrencyCode;
        if (!code) continue;

        // Sadece belirli kurları (Örn: USD, EUR, GBP) alabiliriz ya da hepsini kaydedebiliriz
        const buying = parseFloat(curr.ForexBuying || '0');
        const selling = parseFloat(curr.ForexSelling || '0');

        if (buying > 0 && selling > 0) {
          parsedRates.push({
            currencyCode: code,
            currencyName: curr.CurrencyName,
            buyingRate: buying,
            sellingRate: selling,
            rateDate,
          });
        }
      }

      this.logger.log(`${parsedRates.length} adet döviz kuru başarıyla çekildi.`);
      return parsedRates;
    } catch (error) {
      this.logger.error(`TCMB kurları çekilirken hata oluştu: ${error.message}`, error.stack);
      throw error;
    }
  }
}
