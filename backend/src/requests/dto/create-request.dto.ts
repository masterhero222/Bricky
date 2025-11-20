import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

 @IsEnum(['ВиК', 'Електро', 'Шпакловка и боя', 'Плочки'], {
  each: false, // важно: само една стойност, не масив
  message: 'Невалидна категория',
})

  @IsOptional()
  category?: 'ВиК' | 'Електро' | 'Шпакловка и боя' | 'Плочки';

  @IsString()
  @IsOptional()
  description?: string;
}
