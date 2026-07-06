import {
  IsNotEmpty,
  IsString,
  IsDateString,
  IsOptional,
  IsIn,
} from 'class-validator';

export class CreateAppointmentDto {
  @IsNotEmpty()
  @IsString()
  patientId: string;

  @IsNotEmpty()
  @IsString()
  doctorId: string;

  @IsOptional()
  @IsString()
  chairId?: string;

  @IsNotEmpty()
  @IsDateString()
  startOn: string; // ISO 8601 format: "2025-01-15T09:00:00Z"

  @IsNotEmpty()
  @IsDateString()
  endOn: string; // ISO 8601 format: "2025-01-15T09:30:00Z"

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateAppointmentStatusDto {
  @IsNotEmpty()
  @IsIn([
    'CONFIRMED',
    'CHECKED_IN',
    'COMPLETED',
    'NO_SHOW',
    'CANCELLED',
    'POSTPONED',
  ])
  status: string;

  @IsOptional()
  @IsString()
  reason?: string; // İptal sebebi (CANCELLED durumu için)
}
