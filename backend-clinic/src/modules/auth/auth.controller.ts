import { Controller, Post, Body, Res, Req, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

// Cookie ayarları — production'da ve HTTPS ortamında secure:true olmalı
const COOKIE_OPTIONS = {
  httpOnly: true,       // JS erişimi engellendi (XSS koruması)
  secure: true,         // Sadece HTTPS üzerinden (Zorunlu)
  sameSite: 'strict' as const, // CSRF koruması
  path: '/',
};

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Login — Dakikada max 10 deneme (brute-force koruması)
   * Token'lar HttpOnly cookie olarak set edilir, body'de sadece kullanıcı bilgisi döner.
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    // HttpOnly cookie olarak set et — JS erişemez
    response.cookie('access_token', result.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: result.expires_in * 1000, // ms cinsinden (8 saat)
    });

    response.cookie('refresh_token', result.refresh_token, {
      ...COOKIE_OPTIONS,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 gün (ms)
    });

    // Token'ları body'de döndürme — sadece kullanıcı bilgisi ve klinikler
    return {
      user: result.user,
      tenantId: result.user.clinicId,
      clinics: result.clinics, // Multi-Tenant: Bağlı kliniklerin listesi
    };
  }

  /**
   * Token yenileme — Dakikada max 20 istek
   * Cookie'den refresh token okunur, yeni access token cookie'ye yazılır.
   */
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  async refreshToken(
    @Req() request: any,
    @Res({ passthrough: true }) response: Response,
  ) {
    const token = request.cookies?.['refresh_token'];
    
    if (!token) {
      throw new UnauthorizedException('Refresh token bulunamadı');
    }

    const result = await this.authService.refreshToken({ refreshToken: token });

    // Yeni access token'ı cookie'ye yaz
    response.cookie('access_token', result.access_token, {
      ...COOKIE_OPTIONS,
      maxAge: result.expires_in * 1000,
    });

    return { message: 'Token başarıyla yenilendi.' };
  }

  /**
   * Logout — Cookie'leri temizle
   */
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie('access_token', { path: '/' });
    response.clearCookie('refresh_token', { path: '/' });
    return { message: 'Çıkış yapıldı.' };
  }

  /**
   * Şifremi Unuttum — Secure link üretir
   */
  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  /**
   * Şifre Sıfırlama — Token çözümleyerek şifreyi sıfırlar
   */
  @Post('reset-password')
  async resetPassword(
    @Body('token') token: string,
    @Body('password') password: string
  ) {
    return this.authService.resetPassword(token, password);
  }

  /**
   * Davet Kabul — Şifresiz oluşturulan personel hesabı için ilk şifreyi belirler.
   */
  @Post('accept-invite')
  async acceptInvite(
    @Body('token') token: string,
    @Body('password') password: string
  ) {
    return this.authService.acceptInvite(token, password);
  }
}

