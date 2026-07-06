import { IsString, IsOptional, IsNumber, IsNotEmpty, IsEnum, IsDateString, IsEmail } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsString()
  @IsOptional()
  barcode?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  criticalLevel?: number;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  contactPerson?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  taxNumber?: string;

  @IsString()
  @IsOptional()
  taxOffice?: string;
}

export class CreateStockMovementDto {
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @IsEnum(['IN', 'OUT', 'TRANSFER', 'ADJUSTMENT'])
  type: 'IN' | 'OUT' | 'TRANSFER' | 'ADJUSTMENT';

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsString()
  @IsOptional()
  fromWarehouseId?: string;

  @IsString()
  @IsOptional()
  toWarehouseId?: string;

  @IsString()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  batchNumber?: string;

  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
