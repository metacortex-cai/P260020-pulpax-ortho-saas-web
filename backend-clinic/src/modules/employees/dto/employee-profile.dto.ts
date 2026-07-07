import { IsString, IsOptional, IsDateString, IsInt, IsEnum } from 'class-validator';

export class UpsertEmployeeProfileDto {
  @IsEnum(['DOCTOR', 'ASSISTANT', 'MANAGER', 'OTHER'])
  personnelType: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  bloodType?: string;

  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsString()
  educationField?: string;

  @IsOptional()
  @IsString()
  educationLevel?: string;

  @IsOptional()
  @IsInt()
  graduationYear?: number;

  @IsOptional()
  @IsString()
  diplomaNo?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsDateString()
  hireDate?: string;

  @IsOptional()
  @IsString()
  employmentType?: string;

  @IsOptional()
  @IsString()
  sgkRegistryNo?: string;

  @IsOptional()
  @IsString()
  calendarColor?: string;
}
