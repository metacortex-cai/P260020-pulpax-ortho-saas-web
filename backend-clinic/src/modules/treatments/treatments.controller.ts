import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TreatmentsService } from './treatments.service';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentStatusDto } from './dto/update-treatment-status.dto';
import { UpdateTreatmentDoctorDto } from './dto/update-treatment-doctor.dto';
import { ActivatePlanDto } from './dto/activate-plan.dto';
import { DeleteItemsDto } from './dto/delete-items.dto';

@Controller('treatments')
@UseGuards(JwtAuthGuard)
export class TreatmentsController {
  constructor(private readonly treatmentsService: TreatmentsService) {}

  /**
   * POST /api/v1/treatments/plans
   * Yeni tedavi planı oluşturur. Hasta borcu atomik olarak güncellenir.
   */
  @Post('plans')
  createPlan(
    @Body() createDto: CreateTreatmentPlanDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.treatmentsService.createPlan(createDto, clinicId);
  }

  /**
   * POST /api/v1/treatments/plans/:id/activate
   * Planı aktifleştirir (Sözleşme Oluştur): DRAFT → ACTIVE,
   * tüm kalemleri PENDING → WAITING yapar ve hasta borcunu artırır.
   */
  @Post('plans/:id/activate')
  activatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivatePlanDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.treatmentsService.activatePlan(id, clinicId, dto?.installments, dto?.description);
  }

  /**
   * PATCH /api/v1/treatments/plans/:id/contract
   * Sözleşmesi zaten oluşturulmuş (ACTIVE) bir planın ödeme planını
   * (peşinat/taksitler) ve açıklamasını günceller. Statü/borç değişmez.
   */
  @Patch('plans/:id/contract')
  updateContract(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActivatePlanDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.treatmentsService.updateContract(id, clinicId, dto?.installments, dto?.description);
  }

  /**
   * POST /api/v1/treatments/plans/:id/cancel
   * Plan aktifleştirmesini (sözleşmesini) iptal eder: ACTIVE → DRAFT,
   * kalemleri PENDING durumuna çeker ve hasta borcunu azaltır.
   */
  @Post('plans/:id/cancel')
  cancelPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.treatmentsService.cancelPlan(id, clinicId);
  }

  /**
   * POST /api/v1/treatments/plans/:id/items
   * Mevcut bir plana yeni kalem(ler) ekler.
   */
  @Post('plans/:id/items')
  addItemsToPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { items: any[] },
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.treatmentsService.addItemsToPlan(id, clinicId, body.items);
  }

  /**
   * DELETE /api/v1/treatments/plans/:id
   * Tedavi planını siler. Yalnızca DRAFT (sözleşmesiz) planlar silinebilir.
   */
  @Delete('plans/:id')
  deletePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.treatmentsService.deletePlan(id, clinicId);
  }

  /**
   * DELETE /api/v1/treatments/items
   * Tedavi kalemi(lerini) siler. Yalnızca DRAFT plana ait, ödeme
   * dağıtılmamış kalemler silinebilir.
   */
  @Delete('items')
  deleteItems(
    @Body() dto: DeleteItemsDto,
    @Headers('X-Tenant-ID') clinicId: string,
    @Req() req: any,
  ) {
    return this.treatmentsService.deleteItems(dto.ids, clinicId, dto.reallocate, req.user?.id, req.user?.role);
  }

  /**
   * GET /api/v1/treatments/plans?patientId=...
   * Hastanın tüm tedavi planlarını getirir.
   */
  @Get('plans')
  findByPatient(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('patientId') patientId: string,
  ) {
    return this.treatmentsService.findByPatient(clinicId, patientId);
  }

  /**
   * GET /api/v1/treatments/tariffs
   * Kliniğe tanımlı tüm tarifeleri getirir.
   */
  @Get('tariffs')
  findAllTariffs(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('groupId') groupId?: string,
  ) {
    return this.treatmentsService.findAllTariffs(clinicId, groupId);
  }

  /**
   * GET /api/v1/treatments/tariff-groups
   * Kliniğe tanımlı tüm tarife gruplarını listeler.
   */
  @Get('tariff-groups')
  findAllGroups(@Headers('X-Tenant-ID') clinicId: string) {
    return this.treatmentsService.findAllGroups(clinicId);
  }

  /**
   * POST /api/v1/treatments/tariff-groups
   * Yeni tarife grubu oluşturur.
   */
  @Post('tariff-groups')
  createGroup(
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() createDto: any, // Use any or Import/Use CreateTariffGroupDto
  ) {
    return this.treatmentsService.createGroup(clinicId, createDto);
  }

  /**
   * PATCH /api/v1/treatments/tariff-groups/:id
   * Tarife grubunu günceller.
   */
  @Patch('tariff-groups/:id')
  updateGroup(
    @Param('id') id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() updateDto: any,
  ) {
    return this.treatmentsService.updateGroup(clinicId, id, updateDto);
  }

  /**
   * DELETE /api/v1/treatments/tariff-groups/:id
   * Tarife grubunu siler.
   */
  @Delete('tariff-groups/:id')
  deleteGroup(
    @Param('id') id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.treatmentsService.deleteGroup(clinicId, id);
  }

  /**
   * PATCH /api/v1/treatments/tariffs/:id
   * Tek tarife kaydını günceller (fiyat, durum, para birimi).
   */
  @Patch('tariffs/:id')
  updateTariff(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() data: any,
  ) {
    return this.treatmentsService.updateTariff(id, clinicId, data);
  }

  /**
   * PUT /api/v1/treatments/tariffs/bulk
   * Toplu fiyat / tarife güncellemesi.
   */
  @Put('tariffs/bulk')
  bulkUpdateTariffs(
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() bulkDto: any,
  ) {
    return this.treatmentsService.bulkUpdateTariffs(clinicId, bulkDto);
  }

  /**
   * PATCH /api/v1/treatments/items/:id/status
   * Tedavi kalemi durumunu günceller.
   * COMPLETED → Protokol + Prim tetikler.
   */
  @Patch('items/:id/status')
  updateItemStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTreatmentStatusDto,
    @Headers('X-Tenant-ID') clinicId: string,
    @Req() req: any,
  ) {
    return this.treatmentsService.updateItemStatus(id, clinicId, updateDto, req.user?.id, req.user?.role);
  }

  /**
   * PATCH /api/v1/treatments/items/:id/doctor
   * Tedavi kalemine atanan hekimi değiştirir.
   * COMPLETED statüsündeki kalemlerde hekim değişikliğine izin verilmez.
   */
  @Patch('items/:id/doctor')
  updateItemDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateTreatmentDoctorDto,
    @Headers('X-Tenant-ID') clinicId: string,
    @Req() req: any,
  ) {
    return this.treatmentsService.updateItemDoctor(id, clinicId, updateDto, req.user?.id);
  }
}
