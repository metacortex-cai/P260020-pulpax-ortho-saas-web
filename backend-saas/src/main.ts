import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import { AuditLogService } from './common/services/audit-log.service';

import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Initialize Sentry
  if (process.env.SENTRY_DSN) {
    const Sentry = await import('@sentry/node');
    const { nodeProfilingIntegration } = await import('@sentry/profiling-node');
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      integrations: [nodeProfilingIntegration()],
      tracesSampleRate: 1.0,
      profilesSampleRate: 1.0,
    });
    console.log('Sentry initialized successfully.');
  }

  // HTTPS Options
  let httpsOptions = undefined;
  try {
    const keyPath = path.join(process.cwd(), '../certs/localhost.key');
    const certPath = path.join(process.cwd(), '../certs/localhost.crt');
    if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
      httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath),
      };
      console.log('SSL Certificates loaded successfully. HTTPS enabled.');
    }
  } catch (err) {
    console.warn('SSL Certificates could not be loaded. Falling back to HTTP.', err.message);
  }

  const app = await NestFactory.create(AppModule, { httpsOptions });

  // Trust proxy configuration for Cloudflare and reverse proxies
  const expressApp = app.getHttpAdapter().getInstance();
  if (expressApp && typeof expressApp.set === 'function') {
    expressApp.set('trust proxy', true);
  }

  // Security Headers - Custom CSP to allow localhost client connections over HTTPS
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          connectSrc: ["'self'", "https://localhost:6010", "https://localhost:6001", "wss://localhost:6001"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
        },
      },
    })
  );
  app.use(cookieParser());

  // Global Prefix & Versioning
  app.setGlobalPrefix('api/v1');

  // CORS Configuration - Production-safe over HTTPS
  const allowedOrigins = (process.env.CORS_ORIGIN?.split(',') || ['https://localhost:6001']).map(o => o.trim());
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Tenant-ID'],
    maxAge: 86400,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Exception Filter
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new GlobalExceptionFilter(httpAdapterHost));

  // Global Interceptors
  const auditLogService = app.get(AuditLogService);
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new AuditLogInterceptor(auditLogService)
  );

  // Swagger OpenAPI Documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Pulpax SaaS API')
      .setDescription('Pulpax SaaS Superadmin Dashboard API Specification')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/v1/docs', app, document);
  }

  const port = process.env.PORT || 6000;
  await app.listen(port, '0.0.0.0');
  console.log(`Pulpax API v1 is running on: ${await app.getUrl()}`);
}
bootstrap();
