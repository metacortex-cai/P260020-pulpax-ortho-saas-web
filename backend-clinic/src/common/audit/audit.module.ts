import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AuditLogService } from '../services/audit-log.service';
import { AuditProcessor } from './audit.processor';
import { AUDIT_QUEUE } from './audit.constants';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: AUDIT_QUEUE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      },
    }),
    PrismaModule,
  ],
  providers: [AuditLogService, AuditProcessor],
  exports: [AuditLogService],
})
export class AuditModule {}
