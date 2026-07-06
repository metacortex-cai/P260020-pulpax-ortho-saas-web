import { IsString, IsOptional, IsEnum } from 'class-validator';

export class UploadEmployeeDocumentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(['DIPLOMA', 'SOZLESME', 'KIMLIK', 'SERTIFIKA', 'DIGER'])
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  description?: string;
}
