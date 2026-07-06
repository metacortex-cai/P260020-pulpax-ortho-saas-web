import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SyncVisitDto {
  @ApiProperty({ description: 'Patient UUID' })
  @IsString()
  @IsNotEmpty()
  patientId: string;

  @ApiProperty({ description: 'Full name of the patient' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ description: 'Turkish National ID' })
  @IsString()
  @IsNotEmpty()
  nationalId: string;
}

export class SyncTreatmentDto {
  @ApiProperty({ description: 'Full name of the patient' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ description: 'Tooth number (FDI notation)' })
  @IsNumber()
  toothNumber: number;

  @ApiProperty({ description: 'SUT procedure code' })
  @IsString()
  @IsNotEmpty()
  procedureCode: string;
}
