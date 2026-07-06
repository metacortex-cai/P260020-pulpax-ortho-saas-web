import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentRepository } from './appointment.repository';

@Module({
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentRepository],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
