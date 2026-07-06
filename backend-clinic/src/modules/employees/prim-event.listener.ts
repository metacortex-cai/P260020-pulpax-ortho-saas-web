import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrimService } from './prim.service';
import { TreatmentCompletedEvent, PaymentDistributedEvent, EVENTS } from '../../common/events/domain-events';

/**
 * ADR-003 Faz 3: Prim Olay Dinleyicisi.
 * İki tetikleyiciyi dinler (sıralamadan bağımsız çalışacak şekilde):
 *  - PAYMENT_DISTRIBUTED: ödeme, zaten COMPLETED olan bir kaleme düştüğünde anında primler.
 *  - TREATMENT_COMPLETED: kalem tamamlandığında, tamamlanmadan önce düşmüş
 *    ödeme dağıtımlarını geriye dönük tarayıp primler.
 * Her iki yol da PrimService içinde idempotent'tir; aynı dağıtım iki kez primlenmez.
 */
@Injectable()
export class PrimEventListener {
  private readonly logger = new Logger(PrimEventListener.name);

  constructor(private readonly primService: PrimService) {}

  @OnEvent(EVENTS.PAYMENT_DISTRIBUTED, { async: true })
  async handlePaymentDistributed(event: PaymentDistributedEvent): Promise<void> {
    try {
      const record = await this.primService.calculateForDistribution({
        clinicId: event.clinicId,
        employeeId: event.doctorId,
        treatmentItemId: event.treatmentItemId,
        distributionId: event.distributionId,
        amount: event.amount,
      });
      if (record) {
        this.logger.log(`Prim kaydedildi (ödeme tetikli): ${record.id} | Dağıtım: ${event.distributionId}`);
      }
    } catch (err) {
      this.logger.error(
        `Prim hesaplama hatası (PAYMENT_DISTRIBUTED): Dağıtım=${event.distributionId} | Hata: ${err.message}`,
        err.stack,
      );
    }
  }

  @OnEvent(EVENTS.TREATMENT_COMPLETED, { async: true })
  async handleTreatmentCompleted(event: TreatmentCompletedEvent): Promise<void> {
    try {
      const records = await this.primService.reconcileCompletedItem(event.clinicId, event.employeeId, event.treatmentItemId);
      if (records.length > 0) {
        this.logger.log(`Prim mutabakatı (tedavi tamamlandı): Tedavi=${event.treatmentItemId} | ${records.length} kayıt.`);
      }
    } catch (err) {
      this.logger.error(
        `Prim hesaplama hatası (TREATMENT_COMPLETED): Tedavi=${event.treatmentItemId} | Hata: ${err.message}`,
        err.stack,
      );
    }
  }
}
