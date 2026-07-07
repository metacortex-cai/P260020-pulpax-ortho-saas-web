import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { OcrService } from './ocr.service';
import { PatientRepository } from './patient.repository';

@Module({
  controllers: [PatientsController],
  providers: [PatientsService, PatientRepository, OcrService],
})
export class PatientsModule {}
