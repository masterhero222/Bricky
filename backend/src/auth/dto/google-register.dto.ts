import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';

export class GoogleRegisterDto {
  @IsString()
  credential: string;

  @IsEnum(['client', 'worker'])
  role: 'client' | 'worker';

  @IsOptional()
  @IsString()
  name?: string;

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

  @IsBoolean()
  legalAccepted: boolean;

  @IsString()
  termsVersion: string;

  @IsString()
  privacyVersion: string;
}
