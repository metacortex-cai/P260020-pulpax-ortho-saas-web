import { Controller, Get, Post, Body } from '@nestjs/common';
import { EfaturaService } from './efatura.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('e-Fatura / GİB Entegrasyonu')
@Controller('efatura')
export class EfaturaController {
  constructor(private readonly efaturaService: EfaturaService) {}

  @Get()
  @ApiOperation({ summary: 'Get list of GİB registered e-invoices/e-SMM' })
  getInvoices() {
    return this.efaturaService.getInvoices();
  }

  @Post()
  @ApiOperation({ summary: 'Create and sign new invoice with GİB/E-Signature' })
  createInvoice(
    @Body() body: { patientName: string; taxId: string; amount: number; type: 'E-FATURA' | 'E-ARSIV' | 'E-SMM' }
  ) {
    return this.efaturaService.createInvoice(body.patientName, body.taxId, body.amount, body.type);
  }
}
