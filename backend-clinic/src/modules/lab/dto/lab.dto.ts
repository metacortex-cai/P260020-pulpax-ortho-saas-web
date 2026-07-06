import { IsString, IsNotEmpty, IsOptional, IsEmail, IsBoolean, IsNumber, IsDateString, IsEnum, IsUUID, IsArray, IsObject, ValidateIf } from 'class-validator';

// IsOptional() alone treats '' as present, so format validators (IsEmail/IsUUID/IsDateString)
// still reject it. ValidateIf skips the validator when the field is blank or absent.
const notBlank = (field: string) => (o: any) => o[field] !== undefined && o[field] !== '';

export class CreateLabDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ValidateIf(notBlank('email'))
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  taxOffice?: string;

  @IsString()
  @IsOptional()
  taxNumber?: string;

  @IsString()
  @IsOptional()
  invoiceInfo?: string;
}

export class UpdateLabDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @ValidateIf(notBlank('email'))
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  taxOffice?: string;

  @IsString()
  @IsOptional()
  taxNumber?: string;

  @IsString()
  @IsOptional()
  invoiceInfo?: string;
}

export class CreateLabOrderDto {
  // Tedavi planı kalemine bağlıysa prim/komisyon hesabına dahil olur (opsiyonel).
  @ValidateIf(notBlank('treatmentItemId'))
  @IsUUID('4')
  treatmentItemId?: string;

  @ValidateIf(notBlank('patientId'))
  @IsUUID('4')
  patientId?: string;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  clinicStaffId?: string;

  @IsString()
  @IsOptional()
  labStaffName?: string;

  @ValidateIf(notBlank('labId'))
  @IsUUID('4')
  labId?: string;

  @ValidateIf(notBlank('procedureId'))
  @IsUUID('4')
  procedureId?: string;

  @IsEnum(['GIDEN', 'GELEN'])
  @IsOptional()
  recordType?: string;

  @IsEnum(['YENI', 'PROVA', 'REVIZYON'])
  @IsOptional()
  processType?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @ValidateIf(notBlank('sentDate'))
  @IsDateString()
  sentDate?: string;

  @ValidateIf(notBlank('dueDate'))
  @IsDateString()
  dueDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  colorCode?: string;
}

export class UpdateLabOrderStatusDto {
  @IsEnum(['PENDING', 'SENT', 'RECEIVED', 'FITTED', 'REVISION', 'CANCELLED'])
  status: string;

  @ValidateIf(notBlank('receivedDate'))
  @IsDateString()
  receivedDate?: string;

  @IsString()
  @IsOptional()
  note?: string;
}

export class CreateLabRevisionDto {
  @IsString()
  @IsOptional()
  description?: string;

  @ValidateIf(notBlank('dueDate'))
  @IsDateString()
  dueDate?: string;

  @IsString()
  @IsOptional()
  labStaffName?: string;

  // Revizyon formu ana kaydın tüm bilgilerini önceden doldurur; kullanıcı bunları değiştirebilir.
  // Belirtilmezse ana kayıttaki değer kullanılır (bkz. LabService.addRevision).
  @ValidateIf(notBlank('labId'))
  @IsUUID('4')
  labId?: string;

  @ValidateIf(notBlank('procedureId'))
  @IsUUID('4')
  procedureId?: string;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  clinicStaffId?: string;

  @IsString()
  @IsOptional()
  colorCode?: string;
}

// "İşlemi Teslim Al" formu: mevcut GİDEN kaydını GELEN/RECEIVED durumuna çevirirken
// formdaki güncel bilgileri (ör. teslim alan klinik personeli, nihai maliyet) de kaydeder.
export class DeliverLabOrderDto {
  @ValidateIf(notBlank('patientId'))
  @IsUUID('4')
  patientId?: string;

  @IsString()
  @IsOptional()
  doctorId?: string;

  @IsString()
  @IsOptional()
  clinicStaffId?: string;

  @IsString()
  @IsOptional()
  labStaffName?: string;

  @ValidateIf(notBlank('labId'))
  @IsUUID('4')
  labId?: string;

  @ValidateIf(notBlank('procedureId'))
  @IsUUID('4')
  procedureId?: string;

  @IsNumber()
  @IsOptional()
  cost?: number;

  @ValidateIf(notBlank('dueDate'))
  @IsDateString()
  dueDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  colorCode?: string;
}

export class CreateLabProcedureDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  defaultCost?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class UpdateLabProcedureDto {
  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  defaultCost?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;
}

export class CreateLabTariffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @ValidateIf(notBlank('labId'))
  @IsUUID('4')
  labId?: string;

  @IsString()
  @IsOptional()
  labName?: string;

  @ValidateIf(notBlank('validFrom'))
  @IsDateString()
  validFrom?: string;

  @ValidateIf(notBlank('validTo'))
  @IsDateString()
  validTo?: string;

  @IsArray()
  @IsOptional()
  includedProcIds?: string[];

  @IsObject()
  @IsOptional()
  customPrices?: Record<string, number>;

  @IsEnum(['AKTİF', 'PASİF'])
  @IsOptional()
  status?: string;
}

export class UpdateLabTariffDto {
  @IsString()
  @IsOptional()
  name?: string;

  @ValidateIf(notBlank('validFrom'))
  @IsDateString()
  validFrom?: string;

  @ValidateIf(notBlank('validTo'))
  @IsDateString()
  validTo?: string;

  @IsArray()
  @IsOptional()
  includedProcIds?: string[];

  @IsObject()
  @IsOptional()
  customPrices?: Record<string, number>;

  @IsEnum(['AKTİF', 'PASİF'])
  @IsOptional()
  status?: string;
}
