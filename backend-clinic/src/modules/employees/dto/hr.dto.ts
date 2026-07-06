import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { PartialType, OmitType } from '@nestjs/mapped-types';

export class CreateLeaveDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  @IsDateString()
  startAt: string;

  @IsNotEmpty()
  @IsDateString()
  endAt: string;

  @IsNotEmpty()
  @IsString()
  type: string; // ANNUAL, MEDICAL, EXCUSE, UNPAID, TRAINING, MATERNITY, MILITARY, FORCE_MAJEURE, OTHER

  // Hekim personelin izin aralığıyla çakışan mevcut randevuları varsa (bkz. EmployeesService.createLeave)
  // varsayılan olarak 409 döner; force:true ile kullanıcı çakışmayı bilerek geçer.
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @IsOptional()
  @IsBoolean()
  isFullDay?: boolean;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateLeaveStatusDto {
  @IsEnum(['APPROVED', 'REJECTED', 'PENDING'])
  status: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class UpsertLeaveEntitlementDto {
  @IsNotEmpty()
  @IsNumber()
  year: number;

  @IsNotEmpty()
  @IsNumber()
  totalDays: number;

  @IsOptional()
  @IsNumber()
  carryOverDays?: number;
}

export class ContractCategoryRateDto {
  @IsNotEmpty()
  @IsString()
  category: string;

  @IsNotEmpty()
  @IsNumber()
  rate: number;
}

export class ContractItemFeeDto {
  @IsNotEmpty()
  @IsString()
  masterTreatmentId: string;

  @IsNotEmpty()
  @IsNumber()
  fixedFee: number;
}

export class CreateContractDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  // ADR-003 Faz 3: 4 prim modeli (prim sistemi.md §5)
  @IsEnum(['MODEL_1', 'MODEL_2', 'MODEL_3', 'MODEL_4'])
  type: string;

  // rateMode=BULK iken kullanılan toplu oran (%); CATEGORY iken varsayılan/yedek oran
  @IsNotEmpty()
  @IsNumber()
  rate: number;

  @IsOptional()
  @IsString()
  conditions?: string;

  @IsNotEmpty()
  @IsDateString()
  validFrom: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsNumber()
  fixedSalary?: number;

  @IsOptional()
  @IsEnum(['BULK', 'CATEGORY'])
  rateMode?: string;

  @IsOptional()
  @IsBoolean()
  targetEnabled?: boolean;

  @IsOptional()
  @IsNumber()
  targetAmount?: number;

  @IsOptional()
  @IsBoolean()
  targetCarryOver?: boolean;

  // rateMode=CATEGORY iken kategori bazlı oranlar (Model-1/2/3)
  @IsOptional()
  categoryRates?: ContractCategoryRateDto[];

  // Model-4 için kalem bazlı sabit ücretler
  @IsOptional()
  itemFees?: ContractItemFeeDto[];
}

// employeeId sözleşmenin sahibini değiştirmek için kullanılmaz; kontrat :id üzerinden bulunur.
export class UpdateContractDto extends PartialType(OmitType(CreateContractDto, ['employeeId'] as const)) {}

export class UpdateWorkHourDto {
  @IsNotEmpty()
  @IsNumber()
  dayOfWeek: number;

  @IsNotEmpty()
  @IsBoolean()
  isWorking: boolean;

  @IsOptional()
  @IsString()
  startTime?: string;

  @IsOptional()
  @IsString()
  endTime?: string;
}

export class BulkUpdateWorkHoursDto {
  @IsNotEmpty()
  @IsString()
  employeeId: string;

  @IsNotEmpty()
  workHours: UpdateWorkHourDto[];
}
