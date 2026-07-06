import { IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID, IsIn, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentAllocationDto } from './create-payment.dto';

export class CreateRefundDto {
  @IsNotEmpty({ message: 'Hasta ID zorunludur' })
  @IsUUID('4', { message: 'Hasta ID geçerli bir UUID olmalıdır' })
  patientId: string;

  @IsNotEmpty({ message: 'Miktar zorunludur' })
  @IsNumber({}, { message: 'Miktar sayısal bir değer olmalıdır' })
  @IsPositive({ message: 'Miktar sıfırdan büyük olmalıdır' })
  amount: number;

  @IsNotEmpty({ message: 'Ödeme yöntemi zorunludur' })
  @IsString({ message: 'Ödeme yöntemi metin olmalıdır' })
  @IsIn(['CASH', 'CREDIT_CARD', 'TRANSFER', 'OTHER'], { message: 'Geçersiz ödeme yöntemi' })
  method: string;

  @IsOptional()
  @IsString({ message: 'Açıklama metin olmalıdır' })
  description?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Hesap ID geçerli bir UUID olmalıdır' })
  accountId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];

  @IsOptional()
  @IsNumber({}, { message: 'Avanstan iade tutarı sayısal bir değer olmalıdır' })
  @IsPositive({ message: 'Avanstan iade tutarı sıfırdan büyük olmalıdır' })
  refundFromAdvance?: number;
}
