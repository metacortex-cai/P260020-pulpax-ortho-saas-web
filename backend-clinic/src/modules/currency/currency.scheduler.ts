import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class CurrencyScheduler {
  private readonly logger = new Logger(CurrencyScheduler.name);

  constructor(
    @InjectQueue('currency-queue') private readonly currencyQueue: Queue,
  ) {}

  /**
   * Her iş günü (Pazartesi-Cuma) saat 15:45'te TCMB güncellemelerini tetikler.
   */
  @Cron('45 15 * * 1-5', { timeZone: 'Europe/Istanbul' })
  async triggerDailyRateFetch() {
    this.logger.log('Günlük TCMB kur çekme zamanlayıcısı tetiklendi.');
    
    // BullMQ kuyruğuna iş (job) ekler
    await this.currencyQueue.add(
      'fetch-tcmb-rates',
      { triggeredAt: new Date().toISOString() },
      { 
        attempts: 3, 
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true
      }
    );
  }
}
