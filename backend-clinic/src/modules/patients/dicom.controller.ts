import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Headers,
  UseGuards,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export interface DicomMetadata {
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: 'DX' | 'IO' | 'PX' | 'CT' | 'OTHER';
  manufacturer: string;
  institutionName: string;
  windowCenter: number;
  windowWidth: number;
  pixelSpacing: [number, number];
}

@Controller('dicom')
@UseGuards(JwtAuthGuard)
export class DicomController {
  @Post('parse')
  @UseInterceptors(FileInterceptor('file'))
  async parseDicomFile(
    @UploadedFile() file: any,
    @Headers('X-Tenant-ID') clinicId: string,
    @Body('patientId') patientId?: string,
  ) {
    // Simulated upload processing
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Provide simulated DICOM tags parsed from standard RVG/CBCT file formats
    const metadata: DicomMetadata = {
      patientName: 'YILMAZ^AHMET',
      patientId: patientId || 'P-884920',
      studyDate: new Date().toISOString().replace(/-/g, '').split('T')[0],
      modality: 'IO', // Intra-oral Radiography
      manufacturer: 'Planmeca',
      institutionName: 'Pulpax Dental Clinic',
      windowCenter: 2048,
      windowWidth: 4096,
      pixelSpacing: [0.096, 0.096],
    };

    return {
      success: true,
      message: 'DICOM/RVG file parsed successfully',
      filename: file ? file.originalname : 'mock_xray.dcm',
      size: file ? file.size : 1024 * 512,
      metadata,
    };
  }
}
