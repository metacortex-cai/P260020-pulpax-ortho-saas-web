import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Yetkilendirme (Token) bulunamadı.');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      
      // Kullanıcı bilgilerini Request objesine ekle (Controller'lardan erişebilmek için)
      request['user'] = payload;
      
      // İstemci tarafının (Frontend) gönderdiği X-Tenant-ID header'ına güvenmek yerine, 
      // kriptografik olarak imzalanmış JWT içindeki tenantId'yi ezerek güvenliği sağlıyoruz!
      request.headers['x-tenant-id'] = payload.tenantId;

    } catch {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş token.');
    }
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
