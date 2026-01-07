import { IsEmail, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  @IsIn(['ВиК', 'Електро', 'Шпакловка и боя', 'Плочки'])
  category?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
