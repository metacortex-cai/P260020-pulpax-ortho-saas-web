import { IsArray, ArrayMinSize, IsString, IsNotEmpty, IsNumber, IsPositive, IsDateString, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class PlanInstallmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Taksit etiketi zorunludur' })
  label: string;

  @IsDateString({}, { message: 'Vade tarihi geçerli bir tarih olmalıdır' })
  dueDate: string;

  @IsNumber({}, { message: 'Tutar sayısal bir değer olmalıdır' })
  @IsPositive({ message: 'Tutar sıfırdan büyük olmalıdır' })
  amount: number;
}

export class ActivatePlanDto {
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Ödeme planında en az bir taksit bulunmalıdır' })
  @ValidateNested({ each: true })
  @Type(() => PlanInstallmentDto)
  installments?: PlanInstallmentDto[];

  @IsOptional()
  @IsString()
  description?: string;
}
