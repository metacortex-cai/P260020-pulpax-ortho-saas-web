import { Module } from '@nestjs/common';
import { EmployeesController } from './employees.controller';
import { EmployeesService } from './employees.service';
import { PrimService } from './prim.service';
import { PrimEventListener } from './prim-event.listener';
import { PrimReconciliationService } from './prim-reconciliation.service';
import { EmailModule } from '../email/email.module';
import { AuditModule } from '../../common/audit/audit.module';

@Module({
  imports: [EmailModule, AuditModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, PrimService, PrimEventListener, PrimReconciliationService],
  exports: [EmployeesService, PrimService],
})
export class EmployeesModule {}
