import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';

export interface MedicationDto {
  barcode: string;
  name: string;
  activeSubstance?: string;
  manufacturer?: string;
  prescriptionType?: string;
  sgkCovered?: boolean;
}

@Injectable()
export class IlacRehberiAdapterService {
  private readonly logger = new Logger(IlacRehberiAdapterService.name);
  private readonly BASE_URL = 'https://www.ilacrehberi.com/ilaclar';

  constructor(private readonly httpService: HttpService) {}

  /**
   * İlaç Rehberi anasayfası veya bir listesini kazır.
   * Not: Gerçek senaryoda bu A-Z harf döngüsü ve sayfalama ile yapılmalıdır.
   * MVP amacıyla sembolik olarak sadece bir sayfadan (veya örnek listeden) çeker.
   */
  async scrapeMedications(): Promise<MedicationDto[]> {
    try {
      this.logger.log(`İlaç Rehberi scraping başlatılıyor: ${this.BASE_URL}`);

      // Rate limit ihtimaline karşı HTTP çağrısı
      const response = await lastValueFrom(
        this.httpService.get(this.BASE_URL, {
          timeout: 15000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
          },
        })
      );

      const html = response.data;
      const $ = cheerio.load(html);
      
      const medications: MedicationDto[] = [];

      // HTML DOM yapısına göre ilaç satırlarını bul (Gerçek DOM yapısı incelenip adapte edilmeli)
      // MVP: '.ilac-listesi tr' gibi varsayımsal bir seçici kullanılmıştır.
      $('table.table tbody tr').each((_, element) => {
        const barcode = $(element).find('td:nth-child(1)').text().trim();
        const name = $(element).find('td:nth-child(2)').text().trim();
        const activeSubstance = $(element).find('td:nth-child(3)').text().trim();
        const manufacturer = $(element).find('td:nth-child(4)').text().trim();
        const sgk = $(element).find('td:nth-child(5)').text().trim().toLowerCase() === 'evet';

        if (barcode && name) {
          medications.push({
            barcode,
            name,
            activeSubstance: activeSubstance || undefined,
            manufacturer: manufacturer || undefined,
            prescriptionType: 'Normal', // Varsayılan, detaya inilince çekilir
            sgkCovered: sgk,
          });
        }
      });

      this.logger.log(`${medications.length} ilaç parse edildi.`);
      return medications;
    } catch (error) {
      this.logger.error(`İlaç Rehberi scraping hatası: ${error.message}`, error.stack);
      throw error;
    }
  }
}
