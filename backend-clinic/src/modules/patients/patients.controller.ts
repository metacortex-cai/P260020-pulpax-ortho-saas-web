import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  ParseUUIDPipe,
  Delete,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreatePatientDocumentDto, UploadPatientDocumentDto } from './dto/patient-document.dto';
import { CreateDiagnosisDto } from './dto/diagnosis.dto';
import { CreatePrescriptionDto } from './dto/prescription.dto';
import { CreateNoteDto } from './dto/note.dto';
import { patientDocumentMulterOptions } from './multer-document.config';
import { patientPhotoMulterOptions } from './multer-patient-photo.config';

@Controller('patients')
@UseGuards(JwtAuthGuard)
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  create(
    @Body() createPatientDto: CreatePatientDto,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.create(createPatientDto, clinicId);
  }

  @Get()
  findAll(
    @Headers('X-Tenant-ID') clinicId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: string,
    @Query('clinicBranchId') clinicBranchId?: string,
  ) {
    return this.patientsService.findAll(clinicId, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      sortBy,
      sortDir,
      clinicBranchId,
    });
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.findOne(id, clinicId);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() data: UpdatePatientDto,
  ) {
    return this.patientsService.update(id, data, clinicId);
  }

  // --- Audit Logs ---

  @Get(':id/logs')
  getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.getLogs(id, clinicId);
  }

  // --- Consent OCR ---

  @Post(':id/consent-ocr')
  @UseInterceptors(FileInterceptor('file'))
  async ocrConsentForm(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @UploadedFile() file: any,
  ) {
    return this.patientsService.ocrConsentForm(id, clinicId, file);
  }

  // --- Documents ---

  @Post(':id/documents')
  addDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() dto: CreatePatientDocumentDto,
    @Req() req: any,
  ) {
    return this.patientsService.addDocument(id, clinicId, dto, req.user?.id);
  }

  @Post(':id/documents/upload')
  @UseInterceptors(FileInterceptor('file', patientDocumentMulterOptions))
  uploadDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @UploadedFile() file: any,
    @Body() dto: UploadPatientDocumentDto,
    @Req() req: any,
  ) {
    return this.patientsService.addDocumentWithFile(id, clinicId, file, dto, req.user?.id);
  }

  @Delete('documents/:docId')
  deleteDocument(
    @Param('docId', ParseUUIDPipe) docId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.deleteDocument(docId, clinicId);
  }

  // --- Profil Fotoğrafı ---

  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('file', patientPhotoMulterOptions))
  uploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @UploadedFile() file: any,
  ) {
    return this.patientsService.updatePhoto(id, clinicId, file);
  }

  @Delete(':id/photo')
  deletePhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.deletePhoto(id, clinicId);
  }

  // --- Diyagnoz ---

  @Get(':id/diagnoses')
  getDiagnoses(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.getDiagnoses(id, clinicId);
  }

  @Post(':id/diagnoses')
  createDiagnoses(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() dto: CreateDiagnosisDto,
  ) {
    return this.patientsService.createDiagnoses(id, dto, clinicId);
  }

  @Delete('diagnoses/:diagnosisId')
  deleteDiagnosis(
    @Param('diagnosisId', ParseUUIDPipe) diagnosisId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.deleteDiagnosis(diagnosisId, clinicId);
  }

  // --- Reçeteler ---

  @Get(':id/prescriptions')
  getPrescriptions(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.getPrescriptions(id, clinicId);
  }

  @Post(':id/prescriptions')
  createPrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.patientsService.createPrescription(id, dto, clinicId);
  }

  @Delete('prescriptions/:prescriptionId')
  deletePrescription(
    @Param('prescriptionId', ParseUUIDPipe) prescriptionId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.deletePrescription(prescriptionId, clinicId);
  }

  // --- Notlar ---

  @Get(':id/notes')
  getNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.getNotes(id, clinicId);
  }

  @Post(':id/notes')
  createNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body() dto: CreateNoteDto,
    @Req() req: any,
  ) {
    return this.patientsService.createNote(id, dto, clinicId, req.user?.sub);
  }

  @Delete('notes/:noteId')
  deleteNote(
    @Param('noteId', ParseUUIDPipe) noteId: string,
    @Headers('X-Tenant-ID') clinicId: string,
  ) {
    return this.patientsService.deleteNote(noteId, clinicId);
  }
}
