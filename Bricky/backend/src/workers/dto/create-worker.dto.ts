import { IsEmail, IsNotEmpty, IsString, MinLength, IsArray } from 'class-validator';

export class CreateWorkerDto {
  @IsString()
  @IsNotEmpty()
  fullName: string; // 👈 същото име като в entity-то

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  phone: string;

  @IsString()
  city: string;

  @IsArray()
  skills: string[];
}
