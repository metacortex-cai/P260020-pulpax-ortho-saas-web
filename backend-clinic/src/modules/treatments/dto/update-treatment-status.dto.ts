import { IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';

const TREATMENT_STATUSES = ['PENDING', 'WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];

export class UpdateTreatmentStatusDto {
  @IsNotEmpty({ message: 'Durum zorunludur' })
  @IsString({ message: 'Durum metin olmalıdır' })
  @IsIn(TREATMENT_STATUSES, { 
    message: `Durum şu değerlerden biri olmalıdır: ${TREATMENT_STATUSES.join(', ')}` 
  })
  status: string;

  @IsOptional()
  @IsString({ message: 'Notlar metin olmalıdır' })
  notes?: string;
}
