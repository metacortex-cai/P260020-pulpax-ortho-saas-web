import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT token'ını HttpOnly cookie'den okur.
 * Auth controller, token'ları cookie'ye yazdığı için
 * bu strateji Bearer header yerine cookie'yi kullanır.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('[SECURITY] JWT_SECRET ortam değişkeni tanımlanmamış. Uygulama başlatılamıyor.');
    }
    super({
      // Cookie'den token çıkarımı — Bearer header desteği kaldırıldı
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.['access_token'] ?? null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }
}
