import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MedicationsService } from './medications.service';

@Controller('medications')
@UseGuards(JwtAuthGuard) // API sadece giriş yapmış klinik personeline açıktır
export class MedicationsController {
  constructor(private readonly medicationsService: MedicationsService) {}

  /**
   * GET /api/v1/medications/search?q=Parol
   * Hekimlerin reçete yazarken kullanacağı ilaç arama ucu.
   */
  @Get('search')
  async search(@Query('q') query: string) {
    // Arama sonucunu frontend tarafına direkt JSON olarak dönüyoruz
    return this.medicationsService.searchMedications(query);
  }

  /**
   * GET /api/v1/medications/barcode/:barcode
   */
  @Get('barcode/:barcode')
  async getByBarcode(@Query('barcode') barcode: string) {
    return this.medicationsService.getByBarcode(barcode);
  }
}
