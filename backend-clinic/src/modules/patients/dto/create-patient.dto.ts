import { IsNotEmpty, IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class CreatePatientDto {
  @IsNotEmpty({ message: 'Ad zorunludur' })
  @IsString({ message: 'Ad metinsel olmalıdır' })
  @MinLength(2, { message: 'Ad en az 2 karakter olmalıdır' })
  @MaxLength(100, { message: 'Ad en fazla 100 karakter olmalıdır' })
  firstName: string;

  @IsNotEmpty({ message: 'Soyad zorunludur' })
  @IsString({ message: 'Soyad metinsel olmalıdır' })
  @MinLength(2, { message: 'Soyad en az 2 karakter olmalıdır' })
  @MaxLength(100, { message: 'Soyad en fazla 100 karakter olmalıdır' })
  lastName: string;

  @IsNotEmpty({ message: 'Telefon zorunludur' })
  @Matches(/^[0-9\s\-\+()]+$/, { message: 'Telefon numarası geçersizdir' })
  @MaxLength(20, { message: 'Telefon en fazla 20 karakter olmalıdır' })
  phone: string;

  @IsOptional()
  @Matches(/^\+\d{1,4}$/, { message: 'Ülke kodu geçersiz' })
  countryCode?: string;

  // TC Kimlik No / pasaport format kontrolü servis katmanında `nationality`'e
  // göre yapılır (yabancı hastalar pasaport no formatı gönderir).
  @IsOptional()
  @IsString({ message: 'TC kimlik metinsel olmalıdır' })
  nationalId?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  emergencyName?: string;

  @IsOptional()
  @IsString()
  emergencyPhone?: string;

  @IsOptional()
  @IsString()
  emergencyRelation?: string;

  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @IsOptional()
  @IsString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  tariff?: string;

  @IsOptional()
  @IsString()
  institution?: string;

  @IsOptional()
  @IsString()
  group?: string;

  @IsOptional()
  @IsString()
  family?: string;

  @IsOptional()
  @IsString()
  referral?: string;

  @IsOptional()
  @IsString()
  assignedDoctor?: string;

  @IsOptional()
  @IsString()
  clinicBranchId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  smsConsent?: boolean;

  @IsOptional()
  kvkkConsent?: boolean;

  @IsOptional()
  treatmentConsent?: boolean;

  @IsOptional()
  detailedAnamnesis?: Record<string, any>;
}
