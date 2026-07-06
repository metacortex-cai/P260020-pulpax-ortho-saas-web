import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import { FinanceController } from './finance.controller';
import { FinanceRepository } from './finance.repository';

@Module({
  controllers: [FinanceController],
  providers: [FinanceService, FinanceRepository],
  exports: [FinanceService],
})
export class FinanceModule {}
