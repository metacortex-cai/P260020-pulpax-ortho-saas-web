import { IsNotEmpty, IsUUID } from 'class-validator';

export class CancelRemainingSeriesDto {
  @IsNotEmpty({ message: 'fromAppointmentId zorunludur' })
  @IsUUID('4', { message: 'fromAppointmentId geçerli UUID olmalıdır' })
  fromAppointmentId: string;
}
