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

  // Kullanıcı davet akışı (UsersService.create) tarafından paylaşılır.
  async sendInviteEmail(to: string, firstName: string, inviteLink: string): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 0; }
          .container { max-width: 580px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%); padding: 40px 20px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 40px 30px; line-height: 1.6; }
          .content h2 { font-size: 20px; font-weight: 700; margin-top: 0; color: #0f172a; }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { display: inline-block; background-color: #7c3aed; color: #ffffff !important; text-decoration: none; padding: 14px 30px; font-weight: 700; font-size: 14px; border-radius: 10px; box-shadow: 0 4px 6px rgba(124, 58, 237, 0.25); }
          .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
          .warning { font-size: 12px; color: #94a3b8; margin-top: 20px; border-top: 1px dashed #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>Pulpax Clinic</h1></div>
          <div class="content">
            <h2>Merhaba ${firstName},</h2>
            <p>Pulpax kliniğine kullanıcı olarak eklendiniz. Hesabınıza giriş yapabilmek için önce şifrenizi belirlemeniz gerekiyor. Aşağıdaki butona tıklayarak şifrenizi oluşturabilirsiniz:</p>
            <div class="btn-container">
              <a href="${inviteLink}" class="btn">Şifremi Belirle</a>
            </div>
            <p>Eğer buton çalışmıyorsa aşağıdaki bağlantıyı kopyalayıp tarayıcınızın adres çubuğuna yapıştırabilirsiniz:</p>
            <p style="word-break: break-all; font-size: 13px; color: #6d28d9;"><a href="${inviteLink}">${inviteLink}</a></p>
            <div class="warning">
              <p>⚠️ Bu davet bağlantısı <strong>7 gün</strong> geçerlidir.</p>
            </div>
          </div>
          <div class="footer">© 2026 Pulpax. Tüm Hakları Saklıdır.</div>
        </div>
      </body>
      </html>
    `;

    return this.sendEmail(to, 'Pulpax Kliniğine Davet Edildiniz', html);
  }
}
