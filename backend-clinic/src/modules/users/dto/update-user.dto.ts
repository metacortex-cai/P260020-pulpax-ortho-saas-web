import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

const CLINIC_ROLES = ['SUPERADMIN', 'ADMIN', 'DOCTOR', 'ASSISTANT', 'RECEPTION'];

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsIn(CLINIC_ROLES)
  role?: string;

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

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class DeactivateUserDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferSystemAdminDto {
  @IsString()
  toUserId: string;
}
