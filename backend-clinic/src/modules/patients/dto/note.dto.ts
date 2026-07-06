import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  type?: string;

  @IsString()
  @IsNotEmpty({ message: 'Not içeriği zorunludur' })
  content: string;
}
