import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { ParasutOAuthService } from './parasut-oauth.service';
import { ParasutContactAdapter } from './parasut-contact.adapter';
import { ParasutInvoiceAdapter } from './parasut-invoice.adapter';
import { ParasutProcessor } from './parasut.processor';
import { ParasutEventListener } from './parasut-event.listener';
import { ParasutController } from './parasut.controller';

@Module({
  imports: [
    HttpModule,
    // BullMQ parasut-queue tanımı
    BullModule.registerQueue({
      name: 'parasut-queue',
    }),
  ],
  controllers: [ParasutController],
  providers: [
    ParasutOAuthService,
    ParasutContactAdapter,
    ParasutInvoiceAdapter,
    ParasutProcessor,
    ParasutEventListener,
  ],
  exports: [ParasutOAuthService],
})
export class ParasutModule {}
