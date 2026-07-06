import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrthodonticsService } from './orthodontics.service';
import { orthoRecordMulterOptions } from './multer-ortho-record.config';
import {
  CreateOrthoCaseDto,
  UpdateOrthoCaseDto,
  CreateOrthoDiagnosisDto,
  CreateOrthoRecordDto,
  UploadOrthoRecordDto,
} from './dto/ortho-case.dto';
import {
  CreateOrthoTrackDto,
  UpdateOrthoTrackDto,
  CreateAdjustmentVisitDto,
  CreateActivationLogDto,
  CreateAlignerSetDto,
} from './dto/ortho-track.dto';
import {
  CreateMiniScrewDto,
  UpdateMiniScrewDto,
  CreateGrowthAssessmentDto,
  UpdateGrowthAssessmentDto,
  CreateRetentionPlanDto,
  UpdateRetentionPlanDto,
} from './dto/ortho-extras.dto';

@Controller('orthodontics')
@UseGuards(JwtAuthGuard)
export class OrthodonticsController {
  constructor(private readonly orthodonticsService: OrthodonticsService) {}

  // ── Vakalar ───────────────────────────────────────────────────────────

  /**
   * GET /api/v1/orthodontics/cases?patientId=...
   * Hastanın tüm ortodonti vakalarını (tanı/track/kayıt ağacıyla) getirir.
   */
  @Get('cases')
  findCasesByPatient(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('patientId') patientId: string,
  ) {
    return this.orthodonticsService.findCasesByPatient(clinicId, patientId);
  }

  /**
   * POST /api/v1/orthodontics/cases
   * Yeni ortodonti vakası açar (Faz 01).
   */
  @Post('cases')
  createCase(
    @Body() dto: CreateOrthoCaseDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.createCase(dto, clinicId);
  }

  /**
   * GET /api/v1/orthodontics/cases/:id
   */
  @Get('cases/:id')
  findCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.findCase(id, clinicId);
  }

  /**
   * PATCH /api/v1/orthodontics/cases/:id
   * Vaka durumu / sorumlu doktor / notlar güncellenir.
   */
  @Patch('cases/:id')
  updateCase(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrthoCaseDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.updateCase(id, dto, clinicId);
  }

  // ── Tanı (Faz 02) ─────────────────────────────────────────────────────

  @Post('cases/:id/diagnoses')
  addDiagnosis(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOrthoDiagnosisDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.addDiagnosis(id, dto, clinicId);
  }

  @Delete('diagnoses/:id')
  deleteDiagnosis(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.deleteDiagnosis(id, clinicId);
  }

  // ── Kayıt Setleri (Faz 02 & 07) ───────────────────────────────────────

  @Post('cases/:id/records')
  addRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOrthoRecordDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.addRecord(id, dto, clinicId);
  }

  /**
   * POST /api/v1/orthodontics/cases/:id/records/upload
   * Dosyayı (foto/röntgen/STL) diske yazar ve faz etiketli kayıt seti oluşturur.
   * PatientDocument'ın .../documents/upload endpoint'iyle aynı desen.
   */
  @Post('cases/:id/records/upload')
  @UseInterceptors(FileInterceptor('file', orthoRecordMulterOptions))
  uploadRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @UploadedFile() file: any,
    @Body() dto: UploadOrthoRecordDto,
  ) {
    return this.orthodonticsService.addRecordWithFile(id, clinicId, file, dto);
  }

  @Delete('records/:id')
  deleteRecord(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.deleteRecord(id, clinicId);
  }

  // ── Tedavi Track'leri (Faz 03-04) ─────────────────────────────────────

  /**
   * POST /api/v1/orthodontics/cases/:id/tracks
   * Yeni tedavi track'i başlatır; tariffId verilirse aynı transaction'da
   * DRAFT TreatmentPlan + TreatmentItem oluşturur (fiyat/kademe bağlantısı).
   */
  @Post('cases/:id/tracks')
  createTrack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOrthoTrackDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.createTrack(id, dto, clinicId);
  }

  @Patch('tracks/:id')
  updateTrack(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrthoTrackDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.updateTrack(id, dto, clinicId);
  }

  // ── Faz 05: ilerleme kayıtları ────────────────────────────────────────

  @Post('tracks/:id/visits')
  addAdjustmentVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAdjustmentVisitDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.addAdjustmentVisit(id, dto, clinicId);
  }

  @Delete('visits/:id')
  deleteAdjustmentVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.deleteAdjustmentVisit(id, clinicId);
  }

  @Post('tracks/:id/activations')
  addActivationLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateActivationLogDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.addActivationLog(id, dto, clinicId);
  }

  @Delete('activations/:id')
  deleteActivationLog(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.deleteActivationLog(id, clinicId);
  }

  @Post('tracks/:id/aligner-sets')
  addAlignerSet(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAlignerSetDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.addAlignerSet(id, dto, clinicId);
  }

  @Delete('aligner-sets/:id')
  deleteAlignerSet(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.deleteAlignerSet(id, clinicId);
  }

  // ── Mini Vida ─────────────────────────────────────────────────────────

  @Post('cases/:id/mini-screws')
  addMiniScrew(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMiniScrewDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.addMiniScrew(id, dto, clinicId);
  }

  @Patch('mini-screws/:id')
  updateMiniScrew(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMiniScrewDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.updateMiniScrew(id, dto, clinicId);
  }

  // ── Büyüme Takibi ─────────────────────────────────────────────────────

  @Post('cases/:id/growth-assessments')
  addGrowthAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateGrowthAssessmentDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.addGrowthAssessment(id, dto, clinicId);
  }

  @Patch('growth-assessments/:id')
  updateGrowthAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateGrowthAssessmentDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.updateGrowthAssessment(id, dto, clinicId);
  }

  @Delete('growth-assessments/:id')
  deleteGrowthAssessment(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.deleteGrowthAssessment(id, clinicId);
  }

  // ── Retansiyon (Faz 08) ───────────────────────────────────────────────

  @Post('cases/:id/retention-plans')
  addRetentionPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRetentionPlanDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.addRetentionPlan(id, dto, clinicId);
  }

  @Patch('retention-plans/:id')
  updateRetentionPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRetentionPlanDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.updateRetentionPlan(id, dto, clinicId);
  }

  @Delete('retention-plans/:id')
  deleteRetentionPlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.orthodonticsService.deleteRetentionPlan(id, clinicId);
  }
}
