import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ParasutContactAdapter } from './parasut-contact.adapter';
import { ParasutInvoiceAdapter } from './parasut-invoice.adapter';
import { TenantPrismaService } from '../../prisma/tenant-prisma.service';
import { TenantContext } from '../../common/context/tenant-context';

@Processor('parasut-queue')
export class ParasutProcessor extends WorkerHost {
  private readonly logger = new Logger(ParasutProcessor.name);

  constructor(
    private readonly contactAdapter: ParasutContactAdapter,
    private readonly invoiceAdapter: ParasutInvoiceAdapter,
    private readonly tenantPrisma: TenantPrismaService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Paraşüt Job İşleniyor [${job.id}]: ${job.name}`);
    const { clinicId, entityId, patientId, payload } = job.data;

    try {
      return await TenantContext.run({ clinicId }, async () => {
        const client = await this.tenantPrisma.getClient();
        const integration = await client.clinicIntegration.findUnique({
          where: { clinicId_integrationType: { clinicId, integrationType: 'parasut' } }
        });

        if (!integration || !integration.companyId || integration.status !== 'active') {
          this.logger.warn(`Klinik [${clinicId}] için aktif Paraşüt entegrasyonu yok.`);
          return;
        }

        let parasutEntityId: string | null = null;

        if (job.name === 'sync-patient') {
          parasutEntityId = await this.contactAdapter.syncPatient(clinicId, integration.companyId, payload);
        } else if (job.name === 'sync-invoice') {
          // Önce hastanın Paraşüt ID'sini bulalım
          const patientSyncLog = await client.parasutSyncLog.findFirst({
            where: { clinicId, entityType: 'patient', entityId: patientId, status: 'success' },
            orderBy: { createdAt: 'desc' }
          });

          if (!patientSyncLog || !patientSyncLog.parasutEntityId) {
            this.logger.warn(`Hasta [${patientId}] için Paraşüt kaydı bulunamadı. Fatura senkronizasyonu erteleniyor.`);
            throw new Error(`Hasta için Paraşüt kaydı yok. Önce hasta senkronize edilmeli.`);
          }

          parasutEntityId = await this.invoiceAdapter.syncInvoice(
            clinicId, 
            integration.companyId, 
            payload, 
            patientSyncLog.parasutEntityId
          );
        }
        
        await client.parasutSyncLog.create({
          data: {
            clinicId,
            entityType: job.name.replace('sync-', ''),
            entityId,
            parasutEntityId,
            operation: 'create',
            status: 'success',
            requestPayload: payload
          }
        });

        this.logger.log(`Paraşüt Job Başarılı: ${job.name}`);
        return parasutEntityId;
      });
    } catch (error) {
      this.logger.error(`Paraşüt Job Hatası: ${error.message}`);
      
      await TenantContext.run({ clinicId }, async () => {
        const client = await this.tenantPrisma.getClient();
        await client.parasutSyncLog.create({
          data: {
            clinicId,
            entityType: job.name.replace('sync-', ''),
            entityId,
            operation: 'create',
            status: 'failed',
            errorMessage: error.message,
            requestPayload: payload
          }
        });
      });
      throw error;
    }
  }
}
