import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';

export class RegisterUserDto {
  @IsEnum(['client', 'worker'])
  role: 'client' | 'worker';

  // CLIENT
  @IsOptional()
  @IsString()
  name?: string;

  // WORKER
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  profile?: Record<string, any>;

  @IsOptional()
  @IsString()
  referralCode?: string;

  // COMMON
  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;
}
