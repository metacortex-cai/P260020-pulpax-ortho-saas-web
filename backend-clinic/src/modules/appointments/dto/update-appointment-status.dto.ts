import { IsNotEmpty, IsString, IsIn, ValidateIf, IsISO8601 } from 'class-validator';

const APPOINTMENT_STATUSES = ['PLANNED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'POSTPONED'];

export class UpdateAppointmentStatusDto {
  @IsNotEmpty({ message: 'Durum zorunludur' })
  @IsString({ message: 'Durum metin olmalıdır' })
  @IsIn(APPOINTMENT_STATUSES, {
    message: `Durum şu değerlerden biri olmalıdır: ${APPOINTMENT_STATUSES.join(', ')}`
  })
  status: string;

  // status='POSTPONED' iken zorunlu: ertelenen randevunun yeni tarih/saati (spec §4.3/§10.3)
  @ValidateIf((o) => o.status === 'POSTPONED')
  @IsNotEmpty({ message: 'Ertelenen randevu için yeni başlangıç tarihi zorunludur' })
  @IsISO8601({ strict: true }, { message: 'Yeni başlangıç tarihi ISO 8601 formatında olmalıdır' })
  newStartOn?: string;

  @ValidateIf((o) => o.status === 'POSTPONED')
  @IsNotEmpty({ message: 'Ertelenen randevu için yeni bitiş tarihi zorunludur' })
  @IsISO8601({ strict: true }, { message: 'Yeni bitiş tarihi ISO 8601 formatında olmalıdır' })
  newEndOn?: string;
}
