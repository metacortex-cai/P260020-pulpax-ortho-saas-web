import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly isConfigured: boolean;

  constructor(private readonly configService: ConfigService) {
    const provider = this.configService.get<string>('SMS_PROVIDER');
    const apiKey = this.configService.get<string>('SMS_API_KEY');
    this.isConfigured = !!(provider && apiKey);

    if (this.isConfigured) {
      this.logger.log(`SMS Provider [${provider}] configured and ready.`);
    } else {
      this.logger.warn('SMS provider is not configured. Falling back to console simulation mode.');
    }
  }

  /**
   * SMS gönderir. Sağlayıcı ayarlanmamışsa konsola log basar.
   */
  async sendSms(phone: string, message: string): Promise<boolean> {
    if (this.isConfigured) {
      this.logger.log(`Sending real SMS to ${phone} using provider...`);
      // Burada gerçek provider (Netgsm, Twilio vb.) entegrasyonu yapılacak
      // Şimdilik sadece logluyoruz ama isConfigured true ise buraya düşecek.
      return true;
    } else {
      this.logger.log(`[SMS SIMULATION]`);
      console.log('\n==================================================');
      console.log(`📱 [SMS SIMULATION]`);
      console.log(`To:      ${phone}`);
      console.log(`Message: ${message}`);
      console.log('==================================================\n');
      return true;
    }
  }
}
