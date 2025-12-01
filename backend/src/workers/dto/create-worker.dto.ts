import { IsString, IsNotEmpty, IsEmail, IsArray } from 'class-validator';

export class CreateWorkerDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsArray()
  @IsNotEmpty()
  skills: string[];
}
