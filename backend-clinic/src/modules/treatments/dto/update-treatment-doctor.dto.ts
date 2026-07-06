import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateTreatmentDoctorDto {
  @IsNotEmpty({ message: 'Doktor ID zorunludur' })
  @IsUUID('4', { message: 'Doktor ID geçerli bir UUID olmalıdır' })
  doctorId: string;
}
