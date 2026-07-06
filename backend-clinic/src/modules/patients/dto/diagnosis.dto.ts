import { IsString, IsNotEmpty, IsOptional, IsInt, IsArray, ArrayMinSize } from 'class-validator';

export class CreateDiagnosisDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  toothNums: number[];

  @IsString()
  @IsNotEmpty()
  diagId: string;

  @IsString()
  @IsNotEmpty()
  diagName: string;

  @IsString()
  @IsOptional()
  diagIcd?: string;

  @IsString()
  @IsNotEmpty()
  diagCategory: string;

  @IsString()
  @IsOptional()
  doctorId?: string;
}
