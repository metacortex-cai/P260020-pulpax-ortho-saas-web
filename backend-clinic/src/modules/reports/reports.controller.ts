import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('income/summary')
  getIncomeSummary() {
    return this.reportsService.getIncomeSummary();
  }

  @Get('income/details')
  getIncomeReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getIncomeReport(startDate, endDate);
  }

  @Get('treatments/performance')
  getTreatmentPerformance() {
    return this.reportsService.getTreatmentPerformance();
  }

  @Get('doctors/performance')
  getDoctorPerformance(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getDoctorPerformance(startDate, endDate);
  }

  @Get('labs')
  getLabReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.reportsService.getLabReport(startDate, endDate);
  }
}
