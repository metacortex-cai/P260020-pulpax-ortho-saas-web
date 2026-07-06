import { IsArray, ArrayMinSize, IsUUID } from 'class-validator';

export class DeletePaymentsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'En az bir ödeme ID\'si belirtilmelidir' })
  @IsUUID('4', { each: true, message: 'Geçersiz ödeme ID formatı' })
  ids: string[];
}
