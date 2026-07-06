import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { DicomController } from './dicom.controller';
import { OcrService } from './ocr.service';
import { PatientRepository } from './patient.repository';

@Module({
  controllers: [PatientsController, DicomController],
  providers: [PatientsService, PatientRepository, OcrService],
})
export class PatientsModule {}
