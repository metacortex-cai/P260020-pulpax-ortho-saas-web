import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ParasutOAuthService } from './parasut-oauth.service';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ParasutContactAdapter {
  private readonly logger = new Logger(ParasutContactAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly oauthService: ParasutOAuthService,
  ) {}

  /**
   * Patient verisini Paraşüt 'Contact' nesnesi olarak senkronize eder.
   */
  async syncPatient(clinicId: string, companyId: string, patientData: any): Promise<string | null> {
    const token = await this.oauthService.getValidToken(clinicId);
    if (!token) throw new Error('Paraşüt yetkilendirme token bulunamadı.');

    const url = `https://api.parasut.com/v4/${companyId}/contacts`;
    
    // JSON:API spec payload for Paraşüt
    const payload = {
      data: {
        type: 'contacts',
        attributes: {
          name: `${patientData.firstName} ${patientData.lastName}`,
          contact_type: 'person',
          tax_number: patientData.nationalId || undefined,
          email: patientData.email,
          phone: patientData.phone,
        }
      }
    };

    try {
      const response = await lastValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          }
        })
      );
      
      this.logger.log(`Paraşüt Contact oluşturuldu: ${response.data?.data?.id}`);
      return response.data?.data?.id; // Paraşüt Contact ID'si döner
    } catch (error) {
      this.logger.error(`Paraşüt Contact senkronizasyon hatası: ${error.message}`);
      throw error;
    }
  }
}
