import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsIn,
  ValidateIf,
  ArrayMaxSize,
} from 'class-validator';

export class RegisterUserDto {
  @IsIn(['client', 'worker'])
  role: 'client' | 'worker';

  // ===== CLIENT =====
  @ValidateIf((o) => o.role === 'client')
  @IsString()
  name?: string;

  // ===== WORKER =====
  @ValidateIf((o) => o.role === 'worker')
  @IsString()
  fullName?: string;

  @IsEmail()
  email: string;

  @MinLength(6)
  password: string;

  @ValidateIf((o) => o.role === 'worker')
  @IsString()
  phone?: string;

  @ValidateIf((o) => o.role === 'worker')
  @IsString()
  city?: string;

  @ValidateIf((o) => o.role === 'worker')
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  skills?: string[];
}
