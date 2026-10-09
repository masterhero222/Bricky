import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class DeactivateAccountDto {
  @IsString()
  @MinLength(8)
  @MaxLength(200)
  currentPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
