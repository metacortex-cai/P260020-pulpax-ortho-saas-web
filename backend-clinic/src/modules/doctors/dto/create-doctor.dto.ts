import { IsNotEmpty, IsOptional, IsString, IsEmail, IsBoolean } from 'class-validator';

export class CreateDoctorDto {
  @IsNotEmpty({ message: 'Ad zorunludur' })
  @IsString()
  firstName: string;

  @IsNotEmpty({ message: 'Soyad zorunludur' })
  @IsString()
  lastName: string;

  @IsNotEmpty({ message: 'E-posta zorunludur' })
  @IsEmail({}, { message: 'Geçerli bir e-posta adresi giriniz' })
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsBoolean()
  isDoctor?: boolean;
}
