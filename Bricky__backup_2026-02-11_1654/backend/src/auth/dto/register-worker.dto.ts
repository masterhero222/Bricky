import { IsEmail, IsString, MinLength, IsArray } from 'class-validator';

export class RegisterWorkerDto {
  @IsString()
  fullName: string;

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
