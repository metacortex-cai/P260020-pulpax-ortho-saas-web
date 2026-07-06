import { Controller, Get, Req, Query, Res, UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ParasutOAuthService } from './parasut-oauth.service';
import { Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Controller('parasut')
export class ParasutController {
  private readonly logger = new Logger(ParasutController.name);

  constructor(
    private readonly oauthService: ParasutOAuthService,
    private readonly httpService: HttpService
  ) {}

  /**
   * OAuth için yetkilendirme linkini (URL) üretir ve yönlendirir.
   */
  @UseGuards(JwtAuthGuard)
  @Get('auth/url')
  getAuthUrl(@Req() req: any, @Res() res: Response) {
    const clinicId = req.user.clinicId;
    const clientId = process.env.PARASUT_CLIENT_ID;
    const redirectUri = process.env.PARASUT_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return res.status(500).json({ 
        message: 'Paraşüt entegrasyonu için PARASUT_CLIENT_ID ve PARASUT_REDIRECT_URI konfigüre edilmemiş.' 
      });
    }
    
    const state = Buffer.from(clinicId).toString('base64');
    const url = `https://api.parasut.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&state=${state}`;

    return res.redirect(url);
  }

  /**
   * Paraşüt tarafından dönülen Callback URL.
   * Authorization kodunu alıp gerçek token'a çevirir.
   */
  @Get('auth/callback')
  async handleCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    if (!code || !state) {
      return res.status(400).json({ message: 'Eksik parametreler.' });
    }

    const clinicId = Buffer.from(state, 'base64').toString('utf8');
    const clientId = process.env.PARASUT_CLIENT_ID;
    const clientSecret = process.env.PARASUT_CLIENT_SECRET;
    const redirectUri = process.env.PARASUT_REDIRECT_URI;

    try {
      const tokenUrl = 'https://api.parasut.com/oauth/token';
      const payload = {
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      };

      const response = await lastValueFrom(
        this.httpService.post(tokenUrl, payload)
      );

      const { access_token, refresh_token, expires_in } = response.data;
      
      // Şirket ID'sini almak için profil isteği atılabilir veya kullanıcıdan alınabilir.
      // Genelde token cevabında gelmez, ayrı bir istek (/me veya /v4/me) gerekebilir.
      // Şimdilik token cevabındaki veriyi kaydediyoruz.
      const companyId = response.data.company_id || 'DEFAULT_COMPANY'; 

      await this.oauthService.saveTokens(
        clinicId, 
        access_token, 
        refresh_token, 
        companyId, 
        expires_in
      );

      return res.json({ 
        message: 'Paraşüt bağlantısı başarıyla tamamlandı.', 
        clinicId,
        companyId 
      });
    } catch (error) {
      this.logger.error(`Paraşüt OAuth Callback Hatası: ${error.message}`);
      return res.status(500).json({ 
        message: 'Token değişimi sırasında hata oluştu.',
        error: error.response?.data || error.message 
      });
    }
  }
}
