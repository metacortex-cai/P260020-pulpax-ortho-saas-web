import { IsNotEmpty, IsString, IsOptional, IsBoolean, IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTariffGroupDto {
  @IsNotEmpty({ message: 'Tarife adı zorunludur' })
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sourceGroupId?: string;

  @IsOptional()
  @IsString()
  validFrom?: string;

  @IsOptional()
  @IsString()
  validTo?: string;
}

export class UpdateTariffGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class BulkUpdateTariffItemDto {
  @IsNotEmpty()
  id: string; // can be tariffId or groupEntryId, or CUSTOM-xxx

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsNumber()
  taxRate?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sutCode?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

export class BulkUpdateTariffsDto {
  @IsNotEmpty()
  @IsString()
  groupId: string; // 'default' or a specific groupId

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUpdateTarItem)
  items: BulkUpdateTariffItemDto[];
}

// Helper subclass just for matching nesting
class BulkUpdateTarItem extends BulkUpdateTariffItemDto {}
