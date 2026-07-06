import { Controller, Get, Post, Body, Param, Patch, Delete, Query, Headers, UseGuards, ParseUUIDPipe, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { LabService } from './lab.service';
import {
  CreateLabDto,
  UpdateLabDto,
  CreateLabOrderDto,
  UpdateLabOrderStatusDto,
  CreateLabRevisionDto,
  DeliverLabOrderDto,
  CreateLabProcedureDto,
  UpdateLabProcedureDto,
  CreateLabTariffDto,
  UpdateLabTariffDto,
} from './dto/lab.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Laboratuvar Yönetimi')
@ApiBearerAuth()
@Controller('lab')
@UseGuards(JwtAuthGuard)
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Post('labs')
  @ApiOperation({ summary: 'Yeni laboratuvar ekle' })
  @ApiResponse({ status: 201, description: 'Laboratuvar eklendi.' })
  createLab(@Headers('X-Tenant-ID') clinicId: string, @Body() dto: CreateLabDto) {
    return this.labService.createLab(clinicId, dto);
  }

  @Get('labs')
  @ApiOperation({ summary: 'Tüm laboratuvarları getir' })
  @ApiResponse({ status: 200, description: 'Laboratuvarlar getirildi.' })
  findAllLabs(@Headers('X-Tenant-ID') clinicId: string) {
    return this.labService.findAllLabs(clinicId);
  }

  @Patch('labs/:id')
  @ApiOperation({ summary: 'Laboratuvar bilgilerini güncelle' })
  @ApiResponse({ status: 200, description: 'Laboratuvar güncellendi.' })
  updateLab(@Param('id', ParseUUIDPipe) id: string, @Headers('X-Tenant-ID') clinicId: string, @Body() dto: UpdateLabDto) {
    return this.labService.updateLab(id, clinicId, dto);
  }

  @Delete('labs/:id')
  @ApiOperation({ summary: 'Laboratuvarı pasif hale getir' })
  @ApiResponse({ status: 200, description: 'Laboratuvar pasif hale getirildi.' })
  deactivateLab(@Param('id', ParseUUIDPipe) id: string, @Headers('X-Tenant-ID') clinicId: string) {
    return this.labService.deactivateLab(id, clinicId);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Laboratuvar işi (siparişi) oluştur' })
  @ApiResponse({ status: 201, description: 'Sipariş oluşturuldu.' })
  createOrder(@Headers('X-Tenant-ID') clinicId: string, @Body() dto: CreateLabOrderDto, @Req() req: any) {
    return this.labService.createOrder(clinicId, dto, req.user?.sub);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Tüm laboratuvar siparişlerini getir' })
  @ApiResponse({ status: 200, description: 'Siparişler getirildi.' })
  findAllOrders(@Headers('X-Tenant-ID') clinicId: string, @Query('status') status?: string) {
    return this.labService.findAllOrders(clinicId, status);
  }

  @Patch('orders/:id/status')
  @ApiOperation({ summary: 'Sipariş durumunu güncelle' })
  @ApiResponse({ status: 200, description: 'Durum güncellendi.' })
  updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() dto: UpdateLabOrderStatusDto
  ) {
    return this.labService.updateOrderStatus(id, clinicId, dto);
  }

  @Post('orders/:id/deliver')
  @ApiOperation({ summary: 'İşlemi teslim al (Giden kaydı otomatik Gelen yapar)' })
  @ApiResponse({ status: 200, description: 'İşlem teslim alındı.' })
  deliverOrder(@Param('id', ParseUUIDPipe) id: string, @Headers('X-Tenant-ID') clinicId: string, @Body() dto: DeliverLabOrderDto) {
    return this.labService.deliverOrder(id, clinicId, dto);
  }

  @Post('orders/:id/revision')
  @ApiOperation({ summary: 'Aynı işleme bağlı yeni revizyon kaydı oluştur' })
  @ApiResponse({ status: 201, description: 'Revizyon oluşturuldu.' })
  addRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() dto: CreateLabRevisionDto
  ) {
    return this.labService.addRevision(id, clinicId, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Laboratuvar istatistiklerini getir' })
  @ApiResponse({ status: 200, description: 'İstatistikler getirildi.' })
  getStats(@Headers('X-Tenant-ID') clinicId: string) {
    return this.labService.getStats(clinicId);
  }

  // ------------------------------------------------------------------
  // İşlem Tanımları
  // ------------------------------------------------------------------

  @Get('procedures')
  @ApiOperation({ summary: 'Tüm laboratuvar işlem tanımlarını getir' })
  findAllProcedures(@Headers('X-Tenant-ID') clinicId: string) {
    return this.labService.findAllProcedures(clinicId);
  }

  @Post('procedures')
  @ApiOperation({ summary: 'Yeni laboratuvar işlem tanımı ekle' })
  createProcedure(@Headers('X-Tenant-ID') clinicId: string, @Body() dto: CreateLabProcedureDto) {
    return this.labService.createProcedure(clinicId, dto);
  }

  @Patch('procedures/:id')
  @ApiOperation({ summary: 'Laboratuvar işlem tanımını güncelle' })
  updateProcedure(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() dto: UpdateLabProcedureDto
  ) {
    return this.labService.updateProcedure(id, clinicId, dto);
  }

  @Delete('procedures/:id')
  @ApiOperation({ summary: 'Laboratuvar işlem tanımını pasif yap' })
  deactivateProcedure(@Param('id', ParseUUIDPipe) id: string, @Headers('X-Tenant-ID') clinicId: string) {
    return this.labService.deactivateProcedure(id, clinicId);
  }

  // ------------------------------------------------------------------
  // Tarifeler
  // ------------------------------------------------------------------

  @Get('tariffs')
  @ApiOperation({ summary: 'Tüm laboratuvar tarifelerini getir' })
  findAllTariffs(@Headers('X-Tenant-ID') clinicId: string) {
    return this.labService.findAllTariffs(clinicId);
  }

  @Post('tariffs')
  @ApiOperation({ summary: 'Yeni laboratuvar tarifesi oluştur' })
  createTariff(@Headers('X-Tenant-ID') clinicId: string, @Body() dto: CreateLabTariffDto) {
    return this.labService.createTariff(clinicId, dto);
  }

  @Patch('tariffs/:id')
  @ApiOperation({ summary: 'Laboratuvar tarifesini güncelle' })
  updateTariff(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() dto: UpdateLabTariffDto
  ) {
    return this.labService.updateTariff(id, clinicId, dto);
  }

  @Delete('tariffs/:id')
  @ApiOperation({ summary: 'Laboratuvar tarifesini pasif yap' })
  deleteTariff(@Param('id', ParseUUIDPipe) id: string, @Headers('X-Tenant-ID') clinicId: string) {
    return this.labService.deleteTariff(id, clinicId);
  }
}
