import { IsUUID, IsISO8601, IsOptional, IsString, IsIn, IsBoolean } from 'class-validator';

const APPOINTMENT_STATUSES = ['PLANNED', 'CONFIRMED', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'POSTPONED'];
const APPOINTMENT_TYPES = ['MUAYENE', 'KONTROL', 'TEDAVI'];

export class UpdateAppointmentDto {
  @IsOptional()
  @IsUUID('4', { message: 'Hasta ID geçerli UUID olmalıdır' })
  patientId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Doktor ID geçerli UUID olmalıdır' })
  doctorId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Ünit ID geçerli UUID olmalıdır' })
  chairId?: string;

  @IsOptional()
  @IsUUID('4', { message: 'Klinik ID geçerli UUID olmalıdır' })
  clinicBranchId?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Başlangıç tarihi ISO 8601 formatında olmalıdır' })
  startOn?: string;

  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Bitiş tarihi ISO 8601 formatında olmalıdır' })
  endOn?: string;

  @IsOptional()
  @IsString({ message: 'Durum metin olmalıdır' })
  @IsIn(APPOINTMENT_STATUSES, {
    message: `Durum şu değerlerden biri olmalıdır: ${APPOINTMENT_STATUSES.join(', ')}`,
  })
  status?: string;

  @IsOptional()
  @IsString({ message: 'Not metinsel olmalıdır' })
  notes?: string;

  @IsOptional()
  @IsIn(APPOINTMENT_TYPES, {
    message: `Randevu türü şu değerlerden biri olmalıdır: ${APPOINTMENT_TYPES.join(', ')}`,
  })
  type?: string;

  // Hekimin bu saat diliminde başka aktif randevusu varsa varsayılan olarak 409
  // (conflict payload) döner; force:true ile kullanıcı çakışmayı bilerek geçer
  // (bkz. AppointmentsService.checkConflict).
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
