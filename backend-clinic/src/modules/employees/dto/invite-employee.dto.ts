import { IsOptional, IsString, MinLength } from 'class-validator';

export class InviteEmployeeDto {
  // Belirtilmezse: employee.isDoctor'a göre DOCTOR/ASSISTANT türetilir.
  @IsOptional()
  @IsString()
  role?: string;

  // Belirtilirse hesap şifreli olarak oluşturulur; belirtilmezse davet e-postası gönderilir.
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}
