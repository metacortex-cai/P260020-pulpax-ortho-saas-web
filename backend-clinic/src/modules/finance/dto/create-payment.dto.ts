import { IsNotEmpty, IsNumber, IsPositive, IsString, IsUUID, IsIn, IsOptional, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class PaymentAllocationDto {
  @IsNotEmpty({ message: 'Tedavi kalemi ID zorunludur' })
  @IsUUID('4', { message: 'Tedavi kalemi ID geçerli bir UUID olmalıdır' })
  treatmentItemId: string;

  @IsNotEmpty({ message: 'Tutar zorunludur' })
  @IsNumber({}, { message: 'Tutar sayısal bir değer olmalıdır' })
  @IsPositive({ message: 'Tutar sıfırdan büyük olmalıdır' })
  amount: number;
}

export class CreatePaymentDto {
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
  @IsString({ message: 'Dağılım türü metin olmalıdır' })
  @IsIn(['FIFO', 'TREATMENT_BASED'], { message: 'Dağılım türü FIFO veya TREATMENT_BASED olmalıdır' })
  distributionType?: 'FIFO' | 'TREATMENT_BASED';

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentAllocationDto)
  allocations?: PaymentAllocationDto[];
}
