import { IsString, IsNotEmpty, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @IsEnum(['CASH', 'CREDIT_CARD', 'TRANSFER'])
  @IsOptional()
  paymentMethod?: string;
}
