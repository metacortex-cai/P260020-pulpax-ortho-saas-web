import { Injectable, Logger } from '@nestjs/common';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { HttpService } from '@nestjs/axios';
import * as crypto from 'crypto';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ParasutOAuthService {
  private readonly logger = new Logger(ParasutOAuthService.name);
  private readonly ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
  private readonly ALGORITHM = 'aes-256-gcm';

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly httpService: HttpService
  ) {
    if (!this.ENCRYPTION_KEY || this.ENCRYPTION_KEY.length !== 32) {
      throw new Error('ENCRYPTION_KEY environment variable must be exactly 32 characters long.');
    }
  }

  /**
   * Token verisini şifreler (AES-256-GCM)
   */
  private encryptToken(text: string): string {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.ALGORITHM, Buffer.from(this.ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  }

  /**
   * Şifrelenmiş token verisini çözer
   */
  public decryptToken(encryptedText: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
    if (!ivHex || !authTagHex || !encrypted) return '';
    
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      Buffer.from(this.ENCRYPTION_KEY),
      Buffer.from(ivHex, 'hex')
    );
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * OAuth dönüşünde gelen token'ı şifreleyerek veritabanına kaydeder.
   */
  async saveTokens(clinicId: string, accessToken: string, refreshToken: string, companyId: string, expiresIn: number) {
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn);

    const client = await this.tenantPrisma.getClient();
    await client.clinicIntegration.upsert({
      where: { clinicId_integrationType: { clinicId, integrationType: 'parasut' } },
      update: {
        accessTokenEnc: this.encryptToken(accessToken),
        refreshTokenEnc: this.encryptToken(refreshToken),
        tokenExpiresAt: expiresAt,
        companyId,
        status: 'active',
        lastRefreshAt: new Date()
      },
      create: {
        clinicId,
        integrationType: 'parasut',
        companyId,
        accessTokenEnc: this.encryptToken(accessToken),
        refreshTokenEnc: this.encryptToken(refreshToken),
        tokenExpiresAt: expiresAt,
      }
    });

    this.logger.log(`Klinik [${clinicId}] için Paraşüt token'ları şifrelenerek kaydedildi.`);
  }

  /**
   * Klinik için geçerli token'ı döner, süresi dolmuşsa yeniler.
   */
  async getValidToken(clinicId: string): Promise<string | null> {
    const client = await this.tenantPrisma.getClient();
    const integration = await client.clinicIntegration.findUnique({
      where: { clinicId_integrationType: { clinicId, integrationType: 'parasut' } }
    });

    if (!integration || !integration.accessTokenEnc || !integration.refreshTokenEnc) return null;

    // Token süresi dolmuş mu? (5 dakika tolerans payı ile)
    const now = new Date();
    const expiry = new Date(integration.tokenExpiresAt);
    expiry.setMinutes(expiry.getMinutes() - 5);

    if (now < expiry) {
      return this.decryptToken(integration.accessTokenEnc);
    }

    // Token yenileme (Refresh Token)
    this.logger.log(`Klinik [${clinicId}] için Paraşüt token süresi dolmuş, yenileniyor...`);
    try {
      const refreshToken = this.decryptToken(integration.refreshTokenEnc);
      const tokenUrl = 'https://api.parasut.com/oauth/token';
      const payload = {
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: process.env.PARASUT_CLIENT_ID,
        client_secret: process.env.PARASUT_CLIENT_SECRET,
      };

      const response = await lastValueFrom(
        this.httpService.post(tokenUrl, payload)
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      await this.saveTokens(
        clinicId, 
        access_token, 
        refresh_token, 
        integration.companyId, 
        expires_in
      );

      return access_token;
    } catch (error) {
      this.logger.error(`Token yenileme hatası: ${error.message}`);
      return null;
    }
  }
}
