import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PatientsModule } from './modules/patients/patients.module';
import { TreatmentsModule } from './modules/treatments/treatments.module';
import { FinanceModule } from './modules/finance/finance.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { UsersModule } from './modules/users/users.module';
import { CurrencyModule } from './modules/currency/currency.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { ParasutModule } from './modules/parasut/parasut.module';
import { AuditModule } from './common/audit/audit.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SmsModule } from './modules/sms/sms.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { SupportModule } from './modules/support/support.module';
import { HealthModule } from './modules/health/health.module';
import { UssModule } from './modules/uss/uss.module';
import { EreceteModule } from './modules/erecete/erecete.module';
import { EfaturaModule } from './modules/efatura/efatura.module';
import { AiRadiologyModule } from './modules/ai/ai-radiology.module';
import { OrthodonticsModule } from './modules/orthodontics/orthodontics.module';


import { validate } from './common/config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 1 dakikada IP başına 100 istek sınırı
    }]),
    // BullMQ Redis Bağlantısı
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    // Event-Driven Architecture: Domain event'lerini modüller arası iletişim için kullanır
    EventEmitterModule.forRoot({ wildcard: false }),
    // Zamanlanmış görevler (Cron)
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    PatientsModule,
    TreatmentsModule,
    FinanceModule,
    AppointmentsModule,
    DoctorsModule,
    UsersModule,
    CurrencyModule,
    MedicationsModule,
    ParasutModule,
    NotificationsModule,
    ReportsModule,
    SmsModule,
    RemindersModule,
    AuditModule,
    SupportModule,
    HealthModule,
    UssModule,
    EreceteModule,
    EfaturaModule,
    AiRadiologyModule,
    OrthodonticsModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Tüm rotalar için TenantMiddleware'i global olarak uygula
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}

