import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { RemindersService } from './reminders.service';
import { RemindersProcessor } from './reminders.processor';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'reminders',
    }),
    EmailModule,
    SmsModule,
  ],
  providers: [RemindersService, RemindersProcessor],
})
export class RemindersModule {}
