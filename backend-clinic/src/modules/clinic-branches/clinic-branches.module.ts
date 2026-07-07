import { Module } from '@nestjs/common';
import { ClinicBranchesService } from './clinic-branches.service';
import { ClinicBranchesController } from './clinic-branches.controller';

@Module({
  controllers: [ClinicBranchesController],
  providers: [ClinicBranchesService],
  exports: [ClinicBranchesService],
})
export class ClinicBranchesModule {}
