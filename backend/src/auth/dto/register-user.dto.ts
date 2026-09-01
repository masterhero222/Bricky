import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsArray,
  IsEnum,
  Matches,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import {
  BRICKY_PASSWORD_MAX_LENGTH,
  BRICKY_PASSWORD_MESSAGE,
  BRICKY_PASSWORD_MIN_LENGTH,
  BRICKY_PASSWORD_PATTERN,
} from '../password-policy';

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

  @IsString()
  @MinLength(BRICKY_PASSWORD_MIN_LENGTH, {
    message: BRICKY_PASSWORD_MESSAGE,
  })
  @MaxLength(BRICKY_PASSWORD_MAX_LENGTH)
  @Matches(BRICKY_PASSWORD_PATTERN, { message: BRICKY_PASSWORD_MESSAGE })
  password: string;

  @IsBoolean()
  legalAccepted: boolean;

  @IsString()
  @MaxLength(40)
  termsVersion: string;

  @IsString()
  @MaxLength(40)
  privacyVersion: string;
}
