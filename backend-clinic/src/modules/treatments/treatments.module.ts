import { Module } from '@nestjs/common';
import { TreatmentsService } from './treatments.service';
import { TreatmentsController } from './treatments.controller';
import { TreatmentRepository } from './treatment.repository';
import { AuditModule } from '../../common/audit/audit.module';
import { EmployeesModule } from '../employees/employees.module';

@Module({
  imports: [
    // ADR-003 Faz 4: iptal/hekim değişikliği audit log kaydı için
    AuditModule,
    // PrimService'i export eden EmployeesModule'ü içe aktar (tamamlanmış+primlenmiş
    // tedavi kalemi silme/durum-değiştirme kısıtı için)
    EmployeesModule,
  ],
  controllers: [TreatmentsController],
  providers: [TreatmentsService, TreatmentRepository],
  exports: [TreatmentsService],
})
export class TreatmentsModule {}
