import { IsNotEmpty, IsString, IsIn, IsOptional, IsNumber } from 'class-validator';

export class CreateFinancialAccountDto {
  @IsNotEmpty({ message: 'Hesap adı zorunludur' })
  @IsString({ message: 'Hesap adı metin olmalıdır' })
  name: string;

  @IsNotEmpty({ message: 'Hesap türü zorunludur' })
  @IsString({ message: 'Hesap türü metin olmalıdır' })
  @IsIn(['KASA', 'BANKA', 'POS'], { message: 'Hesap türü KASA, BANKA veya POS olmalıdır' })
  type: string;

  @IsOptional()
  @IsString({ message: 'Para birimi metin olmalıdır' })
  currency?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Açılış bakiyesi sayısal bir değer olmalıdır' })
  initialBalance?: number;

  @IsOptional()
  @IsString({ message: 'Banka adı metin olmalıdır' })
  bankName?: string;

  @IsOptional()
  @IsString({ message: 'Şube metin olmalıdır' })
  branch?: string;

  @IsOptional()
  @IsString({ message: 'IBAN metin olmalıdır' })
  iban?: string;
}
