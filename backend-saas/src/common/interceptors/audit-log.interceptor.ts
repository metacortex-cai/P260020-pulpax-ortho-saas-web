import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AuditLogService } from '../services/audit-log.service';

/**
 * KVKK ve genel güvenlik kapsamında maskelenecek alanlar.
 * Tüm varyantlar (camelCase, snake_case, Türkçe) dahil edilmiştir.
 */
const SENSITIVE_KEYS = new Set([
  // Şifre & kimlik doğrulama
  'password', 'passwordConfirm', 'oldPassword', 'newPassword',
  'pin', 'cvv', 'token', 'accessToken', 'refreshToken',
  'access_token', 'refresh_token', 'secret', 'apiKey', 'api_key',
  // Kimlik bilgileri (KVKK Özel Nitelikli)
  'nationalId', 'national_id', 'ssn',
  'tcKimlik', 'tc_kimlik', 'kimlikNo', 'kimlik_no', 'tc',
  'passportNo', 'passport_no', 'driverLicense', 'driver_license',
  // Finansal bilgiler
  'creditCard', 'credit_card', 'cardNumber', 'card_number',
  'iban', 'banka', 'bankAccount', 'bank_account',
  // Sağlık verileri (PHI)
  'dogumTarihi', 'birthDate', 'birth_date',
  'healthInfo', 'health_info', 'diagnosis', 'prescription',
]);

/**
 * Nesneyi derinlemesine (recursive) tarayarak hassas alanları maskeler.
 * Array içindeki nesneleri de işler.
 */
function sanitizeDeep(obj: unknown, depth = 0): unknown {
  // Sonsuz döngü / çok derin nesne koruması
  if (depth > 5 || obj === null || obj === undefined) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeDeep(item, depth + 1));
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      sanitized[key] = SENSITIVE_KEYS.has(key)
        ? '***MASKED***'
        : sanitizeDeep(value, depth + 1);
    }
    return sanitized;
  }

  // Primitive değerler (string, number, boolean) doğrudan döner
  return obj;
}

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private auditLogService: AuditLogService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();

    const user = (request as any).user;
    const method = request.method;
    const url = request.url;
    const body = request.body;

    return next.handle().pipe(
      tap(async (_data) => {
        // Sadece veri değiştiren operasyonlar (POST, PUT, PATCH, DELETE) log et
        if (user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
          const pathSegments = url.split('/');
          const entity = pathSegments[3] || 'unknown'; // /api/v1/{entity}
          const entityId = pathSegments[4] && !pathSegments[4].includes('?') ? pathSegments[4] : undefined;

          // Derin sanitization — nested nesneler de taranır
          const sanitizedBody =
            body && typeof body === 'object'
              ? sanitizeDeep(body)
              : undefined;

          await this.auditLogService.log({
            userId: user.sub,
            clinicId: user.tenantId,
            action: `${method} ${entity}`,
            entity,
            entityId,
            details: sanitizedBody as Record<string, any> | undefined,
            ipAddress: this.getClientIp(request),
          });
        }
      }),
    );
  }

  private getClientIp(request: Request): string {
    return (
      (request.headers['cf-connecting-ip'] as string) ||
      (request.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      (request.headers['x-real-ip'] as string) ||
      request.ip ||
      request.socket.remoteAddress
    );
  }
}

