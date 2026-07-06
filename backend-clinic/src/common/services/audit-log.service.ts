import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { AUDIT_QUEUE, AUDIT_JOB } from '../audit/audit.constants';
import type { AuditLogJobPayload } from '../audit/audit.processor';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectQueue(AUDIT_QUEUE) private readonly auditQueue: Queue,
    private readonly tenantPrisma: TenantPrismaService,
  ) {}

  /**
   * Audit log kaydını asenkron kuyruğa gönderir (non-blocking).
   * Request döngüsünü yavaşlatmaz.
   */
  async log(data: AuditLogJobPayload): Promise<void> {
    try {
      await this.auditQueue.add(AUDIT_JOB.LOG_EVENT, data, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      });
    } catch (error) {
      this.logger.error(`Audit log kuyruğuna eklenemedi: ${error.message}`);
    }
  }

  /**
   * Bir kullanıcının tüm audit log'larını getir
   */
  async getUserLogs(userId: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    return client.auditLog.findMany({
      where: { userId, clinicId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  /**
   * Bir entity'nin değişiklik geçmişini getir
   */
  async getEntityHistory(entity: string, entityId: string, clinicId: string) {
    const client = await this.tenantPrisma.getClient();
    return client.auditLog.findMany({
      where: { entity, entityId, clinicId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Klinik seviyesinde audit log'larını getir
   */
  async getClinicLogs(clinicId: string, days: number = 30) {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const client = await this.tenantPrisma.getClient();
    return client.auditLog.findMany({
      where: { clinicId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
  }
}
