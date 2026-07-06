import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EVENTS } from '../../common/events/domain-events';

@Injectable()
export class ParasutEventListener {
  private readonly logger = new Logger(ParasutEventListener.name);

  constructor(@InjectQueue('parasut-queue') private readonly parasutQueue: Queue) {}

  /**
   * Hasta oluşturulduğunda dinler ve Paraşüt Contact senkronizasyonunu kuyruğa atar.
   */
  @OnEvent(EVENTS.PATIENT_CREATED, { async: true })
  async handlePatientCreatedEvent(payload: any) {
    this.logger.log(`Event Yakalandı: ${EVENTS.PATIENT_CREATED} (Hasta: ${payload.patientId})`);
    
    await this.parasutQueue.add(
      'sync-patient',
      { 
        clinicId: payload.clinicId, 
        entityId: payload.patientId, 
        payload: payload.data 
      },
      { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true 
      }
    );
  }

  /**
   * Fatura oluşturulduğunda dinler ve Paraşüt SalesInvoice senkronizasyonunu kuyruğa atar.
   */
  @OnEvent(EVENTS.INVOICE_CREATED, { async: true })
  async handleInvoiceCreatedEvent(payload: any) {
    this.logger.log(`Event Yakalandı: ${EVENTS.INVOICE_CREATED} (Ödeme/Fatura: ${payload.paymentId})`);
    
    await this.parasutQueue.add(
      'sync-invoice',
      { 
        clinicId: payload.clinicId, 
        entityId: payload.paymentId, 
        patientId: payload.patientId,
        payload: payload.data 
      },
      { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true 
      }
    );
  }
}
