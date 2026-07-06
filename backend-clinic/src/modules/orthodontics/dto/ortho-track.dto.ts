import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsPositive,
  Min,
} from 'class-validator';

export const ORTHO_TRACK_TYPES = [
  'SABIT',
  'ALIGNER',
  'RPE',
  'HEADGEAR',
  'HABIT',
  'SPACE_MAINTAINER',
  'MYOFUNCTIONAL',
  'ORTHO_RESTORATIVE',
  'KISA_SURELI',
] as const;

export class CreateOrthoTrackDto {
  @IsNotEmpty({ message: 'Tedavi tipi (trackType) zorunludur' })
  @IsIn(ORTHO_TRACK_TYPES as unknown as string[], { message: 'Geçersiz tedavi tipi' })
  trackType: string;

  // Fiyat/kademe: seçilen ortodonti tarifesi. Verilirse doctorId de zorunlu olur
  // ve arka planda TreatmentPlan + TreatmentItem oluşturulur.
  @IsOptional()
  @IsUUID('4', { message: 'Tarife ID geçerli bir UUID olmalıdır' })
  tariffId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Doktor ID geçerli bir UUID olmalıdır' })
  doctorId?: string;

  // Verilmezse tarifenin liste fiyatı kullanılır.
  @IsOptional()
  @IsNumber({}, { message: 'Fiyat sayısal olmalıdır' })
  @IsPositive({ message: 'Fiyat sıfırdan büyük olmalıdır' })
  price?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Başlangıç tarihi geçerli bir tarih olmalıdır' })
  startDate?: string;

  @IsOptional()
  @IsString()
  applianceInfo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrthoTrackDto {
  @IsOptional()
  @IsIn(['AKTIF', 'BITIRME', 'TAMAMLANDI', 'IPTAL'], { message: 'Geçersiz track durumu' })
  status?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Bitiş tarihi geçerli bir tarih olmalıdır' })
  endDate?: string;

  @IsOptional()
  @IsString()
  applianceInfo?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateAdjustmentVisitDto {
  @IsOptional()
  @IsDateString({}, { message: 'Ziyaret tarihi geçerli bir tarih olmalıdır' })
  visitDate?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Randevu ID geçerli bir UUID olmalıdır' })
  appointmentId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Doktor ID geçerli bir UUID olmalıdır' })
  doctorId?: string;

  @IsOptional()
  @IsString()
  wireSize?: string;

  @IsOptional()
  @IsString()
  elasticType?: string;

  @IsOptional()
  @IsBoolean({ message: 'IPR alanı boolean olmalıdır' })
  iprDone?: boolean;

  @IsOptional()
  @IsString()
  iprNote?: string;

  @IsOptional()
  @IsString()
  complianceNote?: string;

  @IsOptional()
  @IsInt({ message: 'Sonraki randevu aralığı hafta cinsinden tam sayı olmalıdır' })
  @Min(1)
  nextVisitWeeks?: number;

  @IsOptional()
  @IsBoolean()
  isEmergency?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateActivationLogDto {
  @IsOptional()
  @IsDateString({}, { message: 'Tarih geçerli bir tarih olmalıdır' })
  date?: string;

  @IsNotEmpty({ message: 'Günlük tipi (logType) zorunludur' })
  @IsIn(['VIDA_TURU', 'KULLANIM_SURESI', 'EGZERSIZ'], { message: 'Geçersiz günlük tipi' })
  logType: string;

  @IsOptional()
  @IsNumber({}, { message: 'Değer sayısal olmalıdır' })
  value?: number;

  @IsOptional()
  @IsIn(['TUR', 'SAAT', 'TEKRAR'], { message: 'Geçersiz birim' })
  unit?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateAlignerSetDto {
  @IsNotEmpty({ message: 'Set numarası zorunludur' })
  @IsInt({ message: 'Set numarası tam sayı olmalıdır' })
  @Min(1)
  setNo: number;

  @IsOptional()
  @IsDateString({}, { message: 'Teslim tarihi geçerli bir tarih olmalıdır' })
  deliveryDate?: string;

  @IsOptional()
  @IsBoolean()
  isRefinement?: boolean;

  @IsOptional()
  @IsString()
  wearComplianceNote?: string;
}
