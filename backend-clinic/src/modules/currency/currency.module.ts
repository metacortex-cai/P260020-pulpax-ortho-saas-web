import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { CurrencyScheduler } from './currency.scheduler';
import { TcmbAdapterService } from './tcmb.adapter';
import { CurrencyProcessor } from './currency.processor';
import { CurrencyService } from './currency.service';
import { CurrencyController } from './currency.controller';

@Module({
  imports: [
    HttpModule,
    // BullMQ currency-queue tanımı
    BullModule.registerQueue({
      name: 'currency-queue',
    }),
  ],
  controllers: [CurrencyController],
  providers: [
    TcmbAdapterService,
    CurrencyScheduler,
    CurrencyProcessor,
    CurrencyService,
  ],
  exports: [CurrencyService], // Diğer modüller (Fatura/Finans) kurları kullanabilir
})
export class CurrencyModule {}
