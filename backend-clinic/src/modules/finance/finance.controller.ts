import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FinanceService } from './finance.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import { CreateExpenseCategoryDto, CreateExpenseDto } from './dto/expense.dto';
import { CreateFinancialAccountDto } from './dto/create-financial-account.dto';
import { DeletePaymentsDto } from './dto/delete-payments.dto';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('payments')
  processPayment(
    @Body() createDto: CreatePaymentDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.processPayment(createDto, clinicId);
  }

  @Get('payments/recent')
  getRecentPayments(@Headers('X-Tenant-ID') clinicId: string) {
    return this.financeService.getRecentPayments(clinicId);
  }

  @Get('patients/:id/balance')
  getPatientBalance(
    @Param('id', ParseUUIDPipe) patientId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.getPatientBalance(clinicId, patientId);
  }

  @Get('patients/:id/payments')
  getPatientPayments(
    @Param('id', ParseUUIDPipe) patientId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.getPaymentHistory(clinicId, patientId);
  }

  @Delete('payments')
  deletePayments(
    @Body() dto: DeletePaymentsDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.deletePayments(dto.ids, clinicId);
  }

  @Get('patients/:id/unpaid-items')
  getUnpaidTreatmentItems(
    @Param('id', ParseUUIDPipe) patientId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.getUnpaidTreatmentItems(clinicId, patientId);
  }

  @Get('patients/:id/paid-items')
  getPaidTreatmentItems(
    @Param('id', ParseUUIDPipe) patientId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.getPaidTreatmentItems(clinicId, patientId);
  }

  @Get('patients/:id/statement')
  getPatientStatement(
    @Param('id', ParseUUIDPipe) patientId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.getPatientStatement(clinicId, patientId);
  }

  @Post('refunds')
  processRefund(
    @Body() dto: CreateRefundDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.processRefund(dto, clinicId);
  }

  // --- Kasa / Banka Hesapları ---

  @Get('accounts')
  getAccounts(@Headers('X-Tenant-ID') clinicId: string) {
    return this.financeService.getAccounts(clinicId);
  }

  @Post('accounts')
  createAccount(
    @Body() dto: CreateFinancialAccountDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.createAccount(dto, clinicId);
  }

  @Get('stats')
  getStats(@Headers('X-Tenant-ID') clinicId: string) {
    return this.financeService.getStats(clinicId);
  }

  // --- Expenses ---

  @Post('expenses/categories')
  createExpenseCategory(
    @Body() dto: CreateExpenseCategoryDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.createExpenseCategory(dto, clinicId);
  }

  @Get('expenses/categories')
  getExpenseCategories(@Headers('X-Tenant-ID') clinicId: string) {
    return this.financeService.getExpenseCategories(clinicId);
  }

  @Post('expenses')
  createExpense(
    @Body() dto: CreateExpenseDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.financeService.createExpense(dto, clinicId);
  }

  @Get('expenses')
  getExpenses(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.financeService.getExpenses(clinicId, startDate, endDate);
  }
}
