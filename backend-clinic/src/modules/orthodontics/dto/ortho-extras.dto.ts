import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  IsArray,
  IsDateString,
  IsPositive,
} from 'class-validator';

export class CreateMiniScrewDto {
  @IsNotEmpty({ message: 'Bölge zorunludur' })
  @IsString()
  region: string;

  @IsOptional()
  @IsDateString({}, { message: 'Yerleştirme tarihi geçerli bir tarih olmalıdır' })
  placementDate?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsArray({ message: 'Kontrol tarihleri bir liste olmalıdır' })
  @IsDateString({}, { each: true, message: 'Kontrol tarihleri geçerli tarihler olmalıdır' })
  followUpDates?: string[];

  @IsOptional()
  @IsString()
  note?: string;

  // Vida başına faturalama: "Mini Vida (Adet)" tarifesi. Verilirse doctorId de
  // zorunlu olur ve arka planda TreatmentPlan + TreatmentItem oluşturulur.
  @IsOptional()
  @IsUUID('4', { message: 'Tarife ID geçerli bir UUID olmalıdır' })
  tariffId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Doktor ID geçerli bir UUID olmalıdır' })
  doctorId?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Fiyat sayısal olmalıdır' })
  @IsPositive({ message: 'Fiyat sıfırdan büyük olmalıdır' })
  price?: number;
}

export class UpdateMiniScrewDto {
  @IsOptional()
  @IsIn(['AKTIF', 'CIKARILDI', 'KAYBEDILDI'], { message: 'Geçersiz mini vida durumu' })
  status?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Çıkarma tarihi geçerli bir tarih olmalıdır' })
  removalDate?: string;

  @IsOptional()
  @IsArray({ message: 'Kontrol tarihleri bir liste olmalıdır' })
  @IsDateString({}, { each: true, message: 'Kontrol tarihleri geçerli tarihler olmalıdır' })
  followUpDates?: string[];

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateGrowthAssessmentDto {
  @IsOptional()
  @IsDateString({}, { message: 'Röntgen tarihi geçerli bir tarih olmalıdır' })
  xrayDate?: string;

  @IsOptional()
  @IsString()
  skeletalAge?: string;

  @IsOptional()
  @IsIn(['ATILIM_ONCESI', 'ATILIMDA', 'ATILIM_SONRASI'], { message: 'Geçersiz büyüme fazı' })
  growthPhase?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateGrowthAssessmentDto {
  @IsOptional()
  @IsDateString({}, { message: 'Röntgen tarihi geçerli bir tarih olmalıdır' })
  xrayDate?: string;

  @IsOptional()
  @IsString()
  skeletalAge?: string;

  @IsOptional()
  @IsIn(['ATILIM_ONCESI', 'ATILIMDA', 'ATILIM_SONRASI'], { message: 'Geçersiz büyüme fazı' })
  growthPhase?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateRetentionPlanDto {
  @IsNotEmpty({ message: 'Retainer tipi zorunludur' })
  @IsIn(['SABIT_LINGUAL', 'HAWLEY', 'ESSIX'], { message: 'Geçersiz retainer tipi' })
  retainerType: string;

  @IsNotEmpty({ message: 'Ark kapsamı zorunludur' })
  @IsIn(['TEK', 'CIFT'], { message: 'Ark kapsamı TEK veya CIFT olmalıdır' })
  archCoverage: string;

  @IsOptional()
  @IsDateString({}, { message: 'Teslim tarihi geçerli bir tarih olmalıdır' })
  deliveryDate?: string;

  // Serbest JSON: [{label: "1. Ay", dueDate: "..."}, ...]
  @IsOptional()
  followUpSchedule?: any;

  @IsOptional()
  @IsString()
  usageInstruction?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateRetentionPlanDto {
  @IsOptional()
  @IsIn(['AKTIF', 'GEVSEMIS', 'KIRIK_KAYIP', 'YENILENDI', 'TAMAMLANDI'], { message: 'Geçersiz retansiyon durumu' })
  status?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Teslim tarihi geçerli bir tarih olmalıdır' })
  deliveryDate?: string;

  // Serbest JSON: [{label: "1. Ay", dueDate: "..."}, ...]
  @IsOptional()
  followUpSchedule?: any;

  @IsOptional()
  @IsString()
  note?: string;
}
