import { IsNotEmpty, IsUUID, IsArray, ValidateNested, IsNumber, IsPositive, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

class TreatmentItemDto {
  @IsNotEmpty({ message: 'Tarife ID zorunludur' })
  @IsUUID('4', { message: 'Tarife ID geçerli bir UUID olmalıdır' })
  tariffId: string;

  @IsNotEmpty({ message: 'Doktor ID zorunludur' })
  @IsUUID('4', { message: 'Doktor ID geçerli bir UUID olmalıdır' })
  doctorId: string;

  @IsOptional()
  @IsNumber({}, { message: 'Diş numarası sayısal olmalıdır' })
  @Min(11, { message: 'Geçersiz diş numarası (min 11)' })
  @Max(85, { message: 'Geçersiz diş numarası (max 85)' })
  toothNo?: number;

  @IsNotEmpty({ message: 'Fiyat zorunludur' })
  @IsNumber({}, { message: 'Fiyat sayısal bir değer olmalıdır' })
  @IsPositive({ message: 'Fiyat sıfırdan büyük olmalıdır' })
  price: number;

  @IsOptional()
  @IsUUID('4', { message: 'Randevu ID geçerli bir UUID olmalıdır' })
  appointmentId?: string;
}

export class CreateTreatmentPlanDto {
  @IsNotEmpty({ message: 'Hasta ID zorunludur' })
  @IsUUID('4', { message: 'Hasta ID geçerli bir UUID olmalıdır' })
  patientId: string;

  @IsArray({ message: 'Tedavi kalemleri bir liste olmalıdır' })
  @ValidateNested({ each: true })
  @Type(() => TreatmentItemDto)
  items: TreatmentItemDto[];
}
