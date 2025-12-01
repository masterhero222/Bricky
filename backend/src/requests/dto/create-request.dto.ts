import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CategoryEnum } from './category.enum';

export class CreateRequestDto {
  @IsString()
  @IsNotEmpty()
  clientName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(CategoryEnum, { message: 'Невалидна категория' })
  @IsOptional()
  category?: CategoryEnum;

  @IsString()
  @IsOptional()
  description?: string;
}
