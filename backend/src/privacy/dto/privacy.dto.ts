import { IsBoolean, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PRIVACY_REQUEST_STATUSES, PRIVACY_REQUEST_TYPES } from '../privacy.constants';
import type { PrivacyRequestStatus, PrivacyRequestType } from '../privacy.constants';

export class UpdatePrivacyPreferencesDto {
  @IsBoolean()
  analyticsConsent: boolean;

  @IsBoolean()
  marketingConsent: boolean;
}

export class CreatePrivacyRequestDto {
  @IsEnum(PRIVACY_REQUEST_TYPES)
  requestType: PrivacyRequestType;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  details: string;
}

export class UpdatePrivacyRequestDto {
  @IsEnum(PRIVACY_REQUEST_STATUSES)
  status: PrivacyRequestStatus;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  responseNotes?: string;
}
