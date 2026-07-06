import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

const CLINIC_ROLES = ['SUPERADMIN', 'ADMIN', 'DOCTOR', 'ASSISTANT', 'RECEPTION'];

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsIn(CLINIC_ROLES)
  role: string;

  // Belirtilirse hesap doğrudan bu şifreyle aktif oluşturulur; belirtilmezse davet e-postası gönderilir.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  title?: string;

  // Var olan bir Personel (Employee) kaydına bu kullanıcı hesabını bağlamak için opsiyonel.
  @IsOptional()
  @IsString()
  employeeId?: string;
}
