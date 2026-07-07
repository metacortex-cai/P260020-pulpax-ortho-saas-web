import {
  IsNotEmpty,
  IsUUID,
  IsISO8601,
  IsOptional,
  IsString,
  IsIn,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

const APPOINTMENT_TYPES = ['MUAYENE', 'KONTROL', 'TEDAVI'];
const SERIES_FREQUENCIES = ['WEEKLY', 'MONTHLY'];

// ADR-004 §3: kötüye kullanım/kaza koruması — bkz. AppointmentsService.createSeries
export const APPOINTMENT_SERIES_MAX_COUNT = 52;
export const APPOINTMENT_SERIES_MAX_UNTIL_YEARS = 2;

export class CreateAppointmentSeriesDto {
  @IsNotEmpty({ message: 'Hasta ID zorunludur' })
  @IsUUID('4', { message: 'Hasta ID geçerli UUID olmalıdır' })
  patientId: string;

  @IsNotEmpty({ message: 'Doktor ID zorunludur' })
  @IsUUID('4', { message: 'Doktor ID geçerli UUID olmalıdır' })
  doctorId: string;

  @IsOptional()
  @IsUUID('4', { message: 'Ünit ID geçerli UUID olmalıdır' })
  chairId?: string;

  @IsOptional()
  @IsIn(APPOINTMENT_TYPES, {
    message: `Randevu türü şu değerlerden biri olmalıdır: ${APPOINTMENT_TYPES.join(', ')}`,
  })
  type?: string;

  @IsOptional()
  @IsString({ message: 'Not metinsel olmalıdır' })
  notes?: string;

  // İlk occurrence — süre (durationMinutes) buradan türetilir, sonraki tüm
  // occurrence'lara aynen uygulanır.
  @IsNotEmpty({ message: 'Başlangıç tarihi zorunludur' })
  @IsISO8601({ strict: true }, { message: 'Başlangıç tarihi ISO 8601 formatında olmalıdır (2026-05-11T09:00:00Z)' })
  startOn: string;

  @IsNotEmpty({ message: 'Bitiş tarihi zorunludur' })
  @IsISO8601({ strict: true }, { message: 'Bitiş tarihi ISO 8601 formatında olmalıdır (2026-05-11T10:00:00Z)' })
  endOn: string;

  @IsNotEmpty({ message: 'Tekrar sıklığı (freq) zorunludur' })
  @IsIn(SERIES_FREQUENCIES, { message: `Tekrar sıklığı şu değerlerden biri olmalıdır: ${SERIES_FREQUENCIES.join(', ')}` })
  freq: 'WEEKLY' | 'MONTHLY';

  @IsNotEmpty({ message: 'Tekrar aralığı (interval) zorunludur' })
  @IsInt({ message: 'Tekrar aralığı tam sayı olmalıdır' })
  @Min(1, { message: 'Tekrar aralığı en az 1 olmalıdır' })
  interval: number;

  // count XOR until zorunlu — tam olarak biri gönderilmeli (AppointmentsService.createSeries
  // içinde manuel çapraz alan kontrolü yapılır, bkz. CreateOrthoTrackDto'daki
  // tariffId/doctorId çapraz kontrolü ile aynı desen).
  @IsOptional()
  @IsInt({ message: 'Tekrar sayısı (count) tam sayı olmalıdır' })
  @Min(1, { message: 'Tekrar sayısı en az 1 olmalıdır' })
  @Max(APPOINTMENT_SERIES_MAX_COUNT, { message: `Tekrar sayısı en fazla ${APPOINTMENT_SERIES_MAX_COUNT} olabilir` })
  count?: number;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Bitiş sınırı (until) ISO 8601 formatında olmalıdır' })
  until?: string;

  // Hekimin bu saat diliminde başka aktif randevusu varsa varsayılan olarak
  // 409 (conflict payload) döner; force:true seri genelinde tek bayrak olarak
  // kullanılır — occurrence-bazlı ayrı onay v1 kapsamı dışıdır (ADR-004 §3).
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
