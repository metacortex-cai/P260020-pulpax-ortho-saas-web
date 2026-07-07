import { IsEmail, IsNotEmpty, IsOptional, IsString, IsBoolean, IsDateString, IsUUID } from 'class-validator';

export class CreateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  // Personel kaydı — giriş hesabı (User) kavramından bağımsızdır. Giriş yetkisi
  // gerekiyorsa ayrıca POST /employees/:id/invite ile bağlanır (bkz. UsersModule).
  @IsOptional()
  @IsBoolean()
  isDoctor?: boolean;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  nationalId?: string;
}

export class DeactivateEmployeeDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  // İşten çıkış tarihi belirtilmezse anlık zaman kullanılır (bkz. EmployeesService.deactivate).
  @IsOptional()
  @IsDateString()
  deactivatedAt?: string;

  // Çıkarılan kişi hekimse ve devredilecek aktif randevu/hasta/tedavi kaydı varsa zorunludur
  // (bkz. EmployeesService.getTerminationImpact).
  @IsOptional()
  @IsUUID('4', { message: 'Devralacak hekim ID geçerli bir UUID olmalıdır' })
  transferToEmployeeId?: string;
}
