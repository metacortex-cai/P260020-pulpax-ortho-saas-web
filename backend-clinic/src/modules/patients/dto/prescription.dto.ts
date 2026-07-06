import { IsString, IsNotEmpty, IsArray, ArrayMinSize, IsDateString } from 'class-validator';

export class CreatePrescriptionDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  doctor: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  drugs: string[];
}
