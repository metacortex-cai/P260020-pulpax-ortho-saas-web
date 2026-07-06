import { IsNotEmpty, IsJWT } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty({ message: 'Refresh token zorunludur' })
  @IsJWT({ message: 'Geçerli bir JWT refresh token giriniz' })
  refreshToken: string;
}
