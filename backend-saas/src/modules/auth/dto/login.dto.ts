import { IsEmail, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  @IsNotEmpty({ message: 'Email zorunludur' })
  email: string;

  @IsNotEmpty({ message: 'Şifre zorunludur' })
  @MinLength(6, { message: 'Şifre en az 6 karakter olmalıdır' })
  @MaxLength(255, { message: 'Şifre en fazla 255 karakter olmalıdır' })
  password: string;
}
