import { IsArray, IsEmail, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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
  @IsIn(['ВиК', 'Електро', 'Шпакловка и боя', 'Плочки', 'Ремонт на покриви', 'Ремонт на бани', 'Основен ремонт', 'Електро инсталация', 'Пребоядисване', 'Освежителен ремонт'])
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  photos?: any[];
}
