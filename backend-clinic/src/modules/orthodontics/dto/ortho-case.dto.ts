import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsDateString,
  Min,
  Max,
} from 'class-validator';

export const ORTHO_CASE_STATUSES = ['AKTIF', 'TAMAMLANDI', 'RETANSIYONDA', 'IPTAL'] as const;

export class CreateOrthoCaseDto {
  @IsNotEmpty({ message: 'Hasta ID zorunludur' })
  @IsUUID('4', { message: 'Hasta ID geçerli bir UUID olmalıdır' })
  patientId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Doktor ID geçerli bir UUID olmalıdır' })
  doctorId?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Başlangıç tarihi geçerli bir tarih olmalıdır' })
  startDate?: string;

  @IsOptional()
  @IsString()
  complaint?: string;

  @IsOptional()
  @IsString()
  expectation?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateOrthoCaseDto {
  @IsOptional()
  @IsIn(ORTHO_CASE_STATUSES as unknown as string[], { message: 'Geçersiz vaka durumu' })
  status?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Doktor ID geçerli bir UUID olmalıdır' })
  doctorId?: string;

  @IsOptional()
  @IsString()
  complaint?: string;

  @IsOptional()
  @IsString()
  expectation?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrthoDiagnosisDto {
  @IsOptional()
  @IsDateString({}, { message: 'Muayene tarihi geçerli bir tarih olmalıdır' })
  examDate?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Doktor ID geçerli bir UUID olmalıdır' })
  doctorId?: string;

  @IsOptional()
  @IsIn(['SINIF_I', 'SINIF_II', 'SINIF_III'], { message: 'Geçersiz iskelet sınıfı' })
  skeletalClass?: string;

  @IsOptional()
  @IsIn(['DUZ', 'KONVEKS', 'KONKAV'], { message: 'Geçersiz profil tipi' })
  profileType?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Overjet sayısal olmalıdır (mm)' })
  overjet?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Overbite sayısal olmalıdır (%)' })
  overbite?: number;

  @IsOptional()
  @IsIn(['HAFIF', 'ORTA', 'SIDDETLI'], { message: 'Geçersiz çapraşıklık derecesi' })
  crowding?: string;

  @IsOptional()
  @IsString()
  openBite?: string;

  @IsOptional()
  @IsString()
  deepBite?: string;

  @IsOptional()
  @IsString()
  crossbite?: string;

  @IsOptional()
  @IsString()
  midlineDeviation?: string;

  @IsOptional()
  @IsString()
  tmjAssessment?: string;

  @IsOptional()
  @IsObject({ message: 'Sefalometrik değerler bir nesne olmalıdır' })
  cephalometricValues?: Record<string, any>;

  @IsOptional()
  @IsString()
  boltonAnalysis?: string;

  @IsOptional()
  @IsString()
  haysNanceAnalysis?: string;

  @IsOptional()
  @IsInt({ message: 'ICON skoru tam sayı olmalıdır' })
  @Min(0)
  @Max(200)
  iconScore?: number;

  @IsOptional()
  @IsObject({ message: 'ICON detayları bir nesne olmalıdır' })
  iconDetails?: Record<string, any>;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrthoRecordDto {
  @IsNotEmpty({ message: 'Kayıt tipi zorunludur' })
  @IsIn(['FOTO', 'OPG', 'SEFALOMETRIK', 'EL_BILEK', 'CBCT', 'STL'], { message: 'Geçersiz kayıt tipi' })
  recordType: string;

  @IsNotEmpty({ message: 'Faz etiketi zorunludur' })
  @IsIn(['FAZ01', 'FAZ02', 'FAZ03', 'FAZ04', 'FAZ05', 'FAZ06', 'FAZ07', 'FAZ08'], { message: 'Geçersiz faz etiketi' })
  phase: string;

  @IsNotEmpty({ message: 'Kayıt adı zorunludur' })
  @IsString()
  name: string;

  @IsNotEmpty({ message: 'Dosya URL zorunludur' })
  @IsString()
  fileUrl: string;

  @IsOptional()
  @IsString()
  fileType?: string;

  @IsOptional()
  @IsInt()
  fileSize?: number;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Çekim tarihi geçerli bir tarih olmalıdır' })
  takenAt?: string;
}

// Dosya yüklemeli kayıt oluşturma: fileUrl/fileType/fileSize multer'dan gelen
// dosyadan türetilir (PatientDocument'ın UploadPatientDocumentDto'suyla aynı desen).
export class UploadOrthoRecordDto {
  @IsNotEmpty({ message: 'Kayıt tipi zorunludur' })
  @IsIn(['FOTO', 'OPG', 'SEFALOMETRIK', 'EL_BILEK', 'CBCT', 'STL'], { message: 'Geçersiz kayıt tipi' })
  recordType: string;

  @IsNotEmpty({ message: 'Faz etiketi zorunludur' })
  @IsIn(['FAZ01', 'FAZ02', 'FAZ03', 'FAZ04', 'FAZ05', 'FAZ06', 'FAZ07', 'FAZ08'], { message: 'Geçersiz faz etiketi' })
  phase: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Çekim tarihi geçerli bir tarih olmalıdır' })
  takenAt?: string;
}
