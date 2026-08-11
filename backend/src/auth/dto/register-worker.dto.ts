import {
  IsArray,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  BRICKY_PASSWORD_MAX_LENGTH,
  BRICKY_PASSWORD_MESSAGE,
  BRICKY_PASSWORD_MIN_LENGTH,
  BRICKY_PASSWORD_PATTERN,
} from '../password-policy';

export class RegisterWorkerDto {
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(BRICKY_PASSWORD_MIN_LENGTH, {
    message: BRICKY_PASSWORD_MESSAGE,
  })
  @MaxLength(BRICKY_PASSWORD_MAX_LENGTH)
  @Matches(BRICKY_PASSWORD_PATTERN, { message: BRICKY_PASSWORD_MESSAGE })
  password: string;

  @IsString()
  phone: string;

  @IsString()
  city: string;

  @IsArray()
  skills: string[];
}
