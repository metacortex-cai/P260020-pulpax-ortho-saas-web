import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;
    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'İç sunucu hatası';
    let errors: any = null;

    // HTTP Exception
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = (exceptionResponse as any)?.message || exception.message;
      errors = (exceptionResponse as any)?.error;
    }
    // Prisma Database Errors
    else if (exception instanceof PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          const target = (exception.meta as any)?.target;
          message = target?.[0] ? `${target[0]} alanı zaten mevcut` : 'Benzersiz alan ihlali';
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          message = 'Kayıt bulunamadı';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          message = 'Veritabanı işlem hatası';
          break;
        }
      }
    }
    // Generic Error
    else if (exception instanceof Error) {
      message = exception.message || 'Bilinmeyen hata';
    }

    // Log error
    this.logger.error({
      message,
      status,
      path: request.url,
      method: request.method,
      exception,
    });
    
    // Capture unhandled exceptions in Sentry (best-effort, non-blocking)
    if (status >= 500) {
      void import('@sentry/node')
        .then((Sentry) => {
          Sentry.captureException(exception);
        })
        .catch((err) => {
          this.logger.error('Sentry captureException başarısız oldu', err);
        });
    }

    // Standardized error response
    const responsePayload = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errors && { errors }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    httpAdapter.reply(response, responsePayload, status);
  }
}
