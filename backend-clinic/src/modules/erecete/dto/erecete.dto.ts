import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEreceteDto {
  @ApiProperty({ description: 'Full name of the patient' })
  @IsString()
  @IsNotEmpty()
  patientName: string;

  @ApiProperty({ description: 'Full name of the doctor prescribing' })
  @IsString()
  @IsNotEmpty()
  doctorName: string;

  @ApiProperty({ description: 'List of medication codes', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  medications: string[];

  @ApiProperty({ description: 'Prescription type (e.g. NORMAL, KIRMIZI)' })
  @IsString()
  @IsNotEmpty()
  type: string;
}
