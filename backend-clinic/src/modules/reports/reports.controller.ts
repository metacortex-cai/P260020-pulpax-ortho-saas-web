import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('income/summary')
  getIncomeSummary(@Query('clinicBranchId') clinicBranchId?: string) {
    return this.reportsService.getIncomeSummary(clinicBranchId);
  }

  @Get('income/details')
  getIncomeReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('clinicBranchId') clinicBranchId?: string,
  ) {
    return this.reportsService.getIncomeReport(startDate, endDate, clinicBranchId);
  }

  @Get('treatments/performance')
  getTreatmentPerformance() {
    return this.reportsService.getTreatmentPerformance();
  }

  @Get('doctors/performance')
  getDoctorPerformance(@Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return this.reportsService.getDoctorPerformance(startDate, endDate);
  }
}
