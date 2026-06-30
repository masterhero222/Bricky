import { IsArray, IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { REPAIR_CATEGORY_KEYS, REPAIR_CATEGORY_LABELS } from '../repair-catalog';

export class CreateRequestDto {
  @IsNotEmpty()
  @IsString()
  clientName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  locationSource?: string;

  @IsOptional()
  @IsIn(REPAIR_CATEGORY_LABELS)
  category?: string;

  @IsOptional()
  @IsIn(REPAIR_CATEGORY_KEYS)
  categoryKey?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  estimateMin?: number;

  @IsOptional()
  @IsNumber()
  estimateMax?: number;

  @IsOptional()
  @IsString()
  estimateCurrency?: string;

  @IsOptional()
  @IsArray()
  photos?: any[];
}
