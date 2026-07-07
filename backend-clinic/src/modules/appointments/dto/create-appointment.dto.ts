import { IsNotEmpty, IsUUID, IsISO8601, IsOptional, IsString, IsIn, IsArray, IsBoolean } from 'class-validator';

const APPOINTMENT_TYPES = ['MUAYENE', 'KONTROL', 'TEDAVI'];

export class CreateAppointmentDto {
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
  @IsUUID('4', { message: 'Klinik ID geçerli UUID olmalıdır' })
  clinicBranchId?: string;

  @IsNotEmpty({ message: 'Başlangıç tarihi zorunludur' })
  @IsISO8601({ strict: true }, { message: 'Başlangıç tarihi ISO 8601 formatında olmalıdır (2026-05-11T09:00:00Z)' })
  startOn: string;

  @IsNotEmpty({ message: 'Bitiş tarihi zorunludur' })
  @IsISO8601({ strict: true }, { message: 'Bitiş tarihi ISO 8601 formatında olmalıdır (2026-05-11T10:00:00Z)' })
  endOn: string;

  @IsOptional()
  @IsString({ message: 'Not metinsel olmalıdır' })
  notes?: string;

  @IsOptional()
  @IsIn(APPOINTMENT_TYPES, {
    message: `Randevu türü şu değerlerden biri olmalıdır: ${APPOINTMENT_TYPES.join(', ')}`,
  })
  type?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true, message: 'Tedavi kalemi ID\'leri geçerli UUID olmalıdır' })
  treatmentItemIds?: string[];

  // Hekimin bu saat diliminde başka aktif randevusu varsa varsayılan olarak 409
  // (conflict payload) döner; force:true ile kullanıcı çakışmayı bilerek geçer
  // (bkz. AppointmentsService.checkConflict).
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
