import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TenantContext } from '../context/tenant-context';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  private readonly logger = new Logger('TenantMiddleware');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;
    let clinicId = req.headers['x-tenant-id'] as string;
    let userId: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const secret = this.configService.get<string>('JWT_SECRET');
        if (secret) {
          const payload = await this.jwtService.verifyAsync(token, { secret });
          // Kriptografik olarak imzalanmış JWT içindeki tenantId, istemcinin gönderdiği
          // X-Tenant-ID header'ını HER ZAMAN geçersiz kılar. Aksi halde geçerli bir token'a
          // sahip herhangi bir kullanıcı, header'ı değiştirerek başka bir kliniğin/tenant'ın
          // veritabanına erişebilir (cross-tenant IDOR).
          clinicId = payload.tenantId;
          req.headers['x-tenant-id'] = payload.tenantId;
          userId = payload.userId || payload.sub;

          this.logger.debug(`Context identified: Tenant=${clinicId}, User=${userId}`);
        } else {
          this.logger.error('JWT_SECRET is not defined in environment variables');
        }
      } catch (err) {
        this.logger.warn(`Token verification failed: ${err.message}`);
      }
    }

    if (!clinicId) {
      this.logger.warn(`No clinicId found for request: ${req.method} ${req.url}`);
    }

    // İstek akışını kiracı bağlamı altında çalıştır
    return TenantContext.run({ clinicId, userId }, () => {
      next();
    });
  }
}
