import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<boolean>('SMTP_SECURE', false);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user) {
      this.logger.log(`SMTP configured. Initializing cloud mailer connection to ${host}:${port}...`);
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port: Number(port),
          secure: String(secure) === 'true',
          auth: {
            user,
            pass,
          },
          pool: true, // Use pooled connections for cloud efficiency
        });
        
        // Asynchronously verify configuration
        this.transporter.verify((error) => {
          if (error) {
            this.logger.error('SMTP connection verification failed:', error.message);
          } else {
            this.logger.log('SMTP connection verified successfully. Ready to deliver emails.');
          }
        });
      } catch (err: any) {
        this.logger.error('Failed to initialize SMTP transporter:', err.message);
      }
    } else {
      this.logger.warn('SMTP host or user is not configured in .env. Falling back to local console simulator mode.');
    }
  }

  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'Pulpax Support');
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL', 'support@pulpax.com');

    if (this.transporter) {
      this.logger.log(`Sending real cloud email to ${to} with subject "${subject}"...`);
      try {
        await this.transporter.sendMail({
          from: `"${fromName}" <${fromEmail}>`,
          to,
          subject,
          html,
        });
        this.logger.log(`Email successfully delivered to ${to}`);
        return true;
      } catch (error: any) {
        this.logger.error(`SMTP delivery failed to ${to}:`, error.message);
        return false;
      }
    } else {
      // Simulation mode
      this.logger.log(`[EMAIL SIMULATION] Falling back because SMTP is unconfigured.`);
      console.log('\n==================================================');
      console.log(`📧 [EMAIL SIMULATION]`);
      console.log(`To:      ${to}`);
      console.log(`Subject: ${subject}`);
      console.log(`From:    "${fromName}" <${fromEmail}>`);
      console.log('--------------------------------------------------');
      console.log('HTML Body Preview:');
      console.log(html);
      console.log('==================================================\n');
      return true;
    }
  }
}
