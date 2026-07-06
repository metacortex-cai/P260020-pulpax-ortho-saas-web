import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt } from 'class-validator';

export class CreatePatientDocumentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  fileType: string;

  @IsEnum(['X-RAY', 'PHOTO', 'CONSENT', 'OTHER'])
  category: string;

  @IsString()
  @IsNotEmpty()
  fileUrl: string;

  @IsInt()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class UploadPatientDocumentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['X-RAY', 'PHOTO', 'CONSENT', 'OTHER'])
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
