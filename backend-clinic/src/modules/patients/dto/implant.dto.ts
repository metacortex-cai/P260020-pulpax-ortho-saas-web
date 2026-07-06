import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateImplantDto {
  @IsString()
  @IsNotEmpty()
  toothNo: string;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsDateString()
  @IsNotEmpty()
  implantDate: string;

  @IsString()
  @IsOptional()
  implantLotNo?: string;

  @IsString()
  @IsOptional()
  implantSerialNo?: string;

  @IsDateString()
  @IsOptional()
  abutmentDate?: string;

  @IsString()
  @IsOptional()
  abutmentLotNo?: string;

  @IsString()
  @IsOptional()
  abutmentSerialNo?: string;

  @IsIn(['BASARILI', 'BASARISIZ'])
  @IsOptional()
  status?: string;
}

export class UpdateImplantDto extends CreateImplantDto {}
