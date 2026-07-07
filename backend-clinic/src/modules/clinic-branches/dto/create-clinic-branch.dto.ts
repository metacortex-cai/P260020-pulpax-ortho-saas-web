import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateClinicBranchDto {
  @IsNotEmpty({ message: 'Klinik adı zorunludur' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
