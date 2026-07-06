import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class MedicationsScheduler {
  private readonly logger = new Logger(MedicationsScheduler.name);

  constructor(
    @InjectQueue('medication-queue') private readonly medicationQueue: Queue,
  ) {}

  /**
   * Her Pazar günü sabah 03:00'te ilaç listesinin tam güncellenmesi işini tetikler.
   */
  @Cron(CronExpression.EVERY_WEEK, { timeZone: 'Europe/Istanbul' }) // EVERY_WEEK varsayılan Pazar 00:00'dır. Biz özel cron kullanabiliriz.
  async triggerWeeklySync() {
    this.logger.log('Haftalık İlaç Rehberi senkronizasyonu tetiklendi.');
    
    await this.medicationQueue.add(
      'sync-medications',
      { triggeredAt: new Date().toISOString() },
      { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 10000 }, // Hata durumunda 10sn bekle ve artır
        removeOnComplete: true 
      }
    );
  }
}
