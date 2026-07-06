import { IsArray, ArrayMinSize, IsUUID, IsOptional, IsBoolean } from 'class-validator';

export class DeleteItemsDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'En az bir tedavi kalemi ID\'si belirtilmelidir' })
  @IsUUID('4', { each: true, message: 'Geçersiz tedavi kalemi ID formatı' })
  ids: string[];

  @IsOptional()
  @IsBoolean()
  reallocate?: boolean;
}
