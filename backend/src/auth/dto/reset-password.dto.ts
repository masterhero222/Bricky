import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  BRICKY_PASSWORD_MAX_LENGTH,
  BRICKY_PASSWORD_MESSAGE,
  BRICKY_PASSWORD_MIN_LENGTH,
  BRICKY_PASSWORD_PATTERN,
} from '../password-policy';

export class ResetPasswordDto {
  @IsString()
  @MinLength(64)
  @MaxLength(128)
  token: string;

  @IsString()
  @MinLength(BRICKY_PASSWORD_MIN_LENGTH, {
    message: BRICKY_PASSWORD_MESSAGE,
  })
  @MaxLength(BRICKY_PASSWORD_MAX_LENGTH)
  @Matches(BRICKY_PASSWORD_PATTERN, { message: BRICKY_PASSWORD_MESSAGE })
  newPassword: string;
}
