import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateEmployeeContactDto {
  @IsEnum(['PHONE', 'EMAIL', 'ADDRESS', 'EMERGENCY_CONTACT'])
  type: string;

  @IsNotEmpty()
  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  emergencyName?: string;

  @IsOptional()
  @IsString()
  emergencyRelation?: string;
}
