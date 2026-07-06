import { IsNotEmpty, IsUUID, IsISO8601 } from 'class-validator';

export class CheckWorkHoursDto {
  @IsNotEmpty({ message: 'Hekim ID zorunludur' })
  @IsUUID('4', { message: 'Hekim ID geçerli UUID olmalıdır' })
  employeeId: string;

  @IsNotEmpty({ message: 'Başlangıç tarihi zorunludur' })
  @IsISO8601({ strict: true }, { message: 'Başlangıç tarihi ISO 8601 formatında olmalıdır' })
  startOn: string;

  @IsNotEmpty({ message: 'Bitiş tarihi zorunludur' })
  @IsISO8601({ strict: true }, { message: 'Bitiş tarihi ISO 8601 formatında olmalıdır' })
  endOn: string;
}
