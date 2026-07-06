import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantContext } from '../context/tenant-context';
import { AUDIT_QUEUE, AUDIT_JOB } from './audit.constants';

export interface AuditLogJobPayload {
  userId?: string;
  clinicId: string;
  action: string;
  entity: string;
  entityId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
}

@Processor(AUDIT_QUEUE)
export class AuditProcessor extends WorkerHost {
  private readonly logger = new Logger(AuditProcessor.name);

  constructor(private readonly tenantPrisma: TenantPrismaService) {
    super();
  }

  async process(job: Job<AuditLogJobPayload>) {
    if (job.name === AUDIT_JOB.LOG_EVENT) {
      await this.handleLogEvent(job.data);
    }
  }

  private async handleLogEvent(data: AuditLogJobPayload) {
    try {
      // Execute database operations within the scoped TenantContext block
      await TenantContext.run({ clinicId: data.clinicId }, async () => {
        const client = await this.tenantPrisma.getClient();
        
        await client.$executeRawUnsafe(`
          INSERT INTO "audit_logs" 
            (id, clinic_id, user_id, action, entity, entity_id, details, ip_address, created_at)
          VALUES 
            (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW())
        `,
          data.clinicId,
          data.userId ?? null,
          data.action,
          data.entity,
          data.entityId ?? '',
          data.details ? JSON.stringify(data.details) : null,
          data.ipAddress ?? null,
        );
      });
    } catch (error) {
      this.logger.error(`Audit log kuyruğu işlenirken hata: ${error.message}`, error.stack);
      throw error;
    }
  }
}
