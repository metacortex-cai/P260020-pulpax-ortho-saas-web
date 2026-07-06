import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrencyService } from './currency.service';

@ApiTags('Döviz / TCMB Kurları')
@ApiBearerAuth()
@Controller('currency')
@UseGuards(JwtAuthGuard)
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  /**
   * GET /api/v1/currency/rates
   * En güncel TCMB döviz kurlarını getirir.
   */
  @Get('rates')
  @ApiOperation({ summary: 'Güncel döviz kurlarını getir (TCMB)' })
  @ApiResponse({ status: 200, description: 'Güncel kurlar.' })
  getLatestRates() {
    return this.currencyService.getLatestRates();
  }

  /**
   * GET /api/v1/currency/rate?code=USD&date=2026-05-15
   * Belirli bir günün kurunu (veya tatilse bir önceki iş gününün kurunu) getirir.
   */
  @Get('rate')
  @ApiOperation({ summary: 'Belirli bir tarihteki döviz kurunu getir' })
  @ApiResponse({ status: 200, description: 'Tarihsel kur değeri.' })
  async getHistoricalRate(
    @Query('code') code: string,
    @Query('date') dateStr: string
  ) {
    const targetDate = new Date(dateStr);
    return this.currencyService.getRate(code, targetDate);
  }
}
