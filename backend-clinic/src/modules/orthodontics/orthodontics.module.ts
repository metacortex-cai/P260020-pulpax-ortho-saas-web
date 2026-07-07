import { Module } from '@nestjs/common';
import { OrthodonticsService } from './orthodontics.service';
import { OrthodonticsController } from './orthodontics.controller';
import { AppointmentsModule } from '../appointments/appointments.module';

// ADR-004 §2: Zaman Çizelgesi → Randevu senkronu, AppointmentsModule'ün
// AppointmentsService'ini enjekte ederek yapılır (tek yönlü bağımlılık,
// AppointmentsModule ortodontiyi bilmez — modüler monolith sınırı korunur).
@Module({
  imports: [AppointmentsModule],
  controllers: [OrthodonticsController],
  providers: [OrthodonticsService],
  exports: [OrthodonticsService],
})
export class OrthodonticsModule {}
