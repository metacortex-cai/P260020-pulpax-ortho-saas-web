import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { MedicationsScheduler } from './medications.scheduler';
import { IlacRehberiAdapterService } from './ilacrehberi.adapter';
import { MedicationsProcessor } from './medications.processor';
import { MedicationsService } from './medications.service';
import { MedicationsController } from './medications.controller';

@Module({
  imports: [
    HttpModule,
    // BullMQ medication-queue tanımı
    BullModule.registerQueue({
      name: 'medication-queue',
    }),
  ],
  controllers: [MedicationsController],
  providers: [
    IlacRehberiAdapterService,
    MedicationsScheduler,
    MedicationsProcessor,
    MedicationsService,
  ],
  exports: [MedicationsService], 
})
export class MedicationsModule {}
