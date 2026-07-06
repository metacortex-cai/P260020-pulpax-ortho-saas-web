import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ParasutOAuthService } from './parasut-oauth.service';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ParasutInvoiceAdapter {
  private readonly logger = new Logger(ParasutInvoiceAdapter.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly oauthService: ParasutOAuthService,
  ) {}

  /**
   * Pulpax Invoice verisini Paraşüt 'SalesInvoice' olarak senkronize eder.
   */
  async syncInvoice(clinicId: string, companyId: string, invoiceData: any, parasutContactId: string): Promise<string | null> {
    const token = await this.oauthService.getValidToken(clinicId);
    if (!token) throw new Error('Paraşüt yetkilendirme token bulunamadı.');

    const url = `https://api.parasut.com/v4/${companyId}/sales_invoices`;
    
    const payload = {
      data: {
        type: 'sales_invoices',
        attributes: {
          item_type: 'invoice',
          description: invoiceData.description || 'Diş Tedavi Faturası',
          issue_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
          due_date: new Date().toISOString().split('T')[0],
          currency: 'TRL' // Döviz kuru modülünden çekilen kur ile beslenecek
        },
        relationships: {
          contact: {
            data: { type: 'contacts', id: parasutContactId }
          },
          details: {
            data: invoiceData.items.map((item: any) => ({
              type: 'sales_invoice_details',
              attributes: {
                quantity: item.quantity || 1,
                unit_price: item.price,
                vat_rate: item.vatRate || 10,
                description: item.name
              }
            }))
          }
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
      
      this.logger.log(`Paraşüt Fatura oluşturuldu: ${response.data?.data?.id}`);
      return response.data?.data?.id; 
    } catch (error) {
      this.logger.error(`Paraşüt Fatura senkronizasyon hatası: ${error.message}`);
      throw error;
    }
  }
}
