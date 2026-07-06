import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    const { method, url } = request;
    const startTime = Date.now();
    const userInfo = (request as any).user ? `[${(request as any).user.email}]` : '';

    this.logger.debug(`[${method}] ${url} ${userInfo} - Starting`);

    return next.handle().pipe(
      tap((_data) => {
        const duration = Date.now() - startTime;
        this.logger.debug(
          `[${method}] ${url} ${userInfo} - ${response.statusCode} (${duration}ms)`
        );
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.logger.error(
          `[${method}] ${url} ${userInfo} - ${error.status || 500} (${duration}ms): ${error.message}`
        );
        throw error;
      }),
    );
  }
}
