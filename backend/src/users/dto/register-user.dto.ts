import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsIn,
  ValidateIf,
  ArrayMaxSize,
  Matches,
  MaxLength,
} from 'class-validator';
import {
  BRICKY_PASSWORD_MAX_LENGTH,
  BRICKY_PASSWORD_MESSAGE,
  BRICKY_PASSWORD_MIN_LENGTH,
  BRICKY_PASSWORD_PATTERN,
} from '../../auth/password-policy';

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

  @IsString()
  @MinLength(BRICKY_PASSWORD_MIN_LENGTH, {
    message: BRICKY_PASSWORD_MESSAGE,
  })
  @MaxLength(BRICKY_PASSWORD_MAX_LENGTH)
  @Matches(BRICKY_PASSWORD_PATTERN, { message: BRICKY_PASSWORD_MESSAGE })
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
