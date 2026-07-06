import { IsString, IsNotEmpty, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AnalyzeXrayDto {
  @ApiProperty({ description: 'Publicly accessible URL of the X-Ray image' })
  @IsString()
  @IsNotEmpty()
  @IsUrl()
  imageUrl: string;
}
