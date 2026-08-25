import {
  IsArray,
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateWorkerOnboardingStepDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsIn(['phone', 'viber', 'whatsapp', 'email'])
  preferredContactMethod?: string;

  @IsOptional()
  @IsBoolean()
  contactAccuracyConfirmed?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  primaryCategoryKey?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsIn(['solo', 'team', 'company'])
  workType?: string;

  @IsOptional()
  @IsIn(['under_1', '1_3', '4_7', '8_15', '15_plus'])
  experienceRange?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @IsIn(['yes', 'limited', 'no'])
  availabilityStatus?: string;

  @IsOptional()
  @IsIn([
    'founder_outreach',
    'worker_referral',
    'client_referral',
    'facebook_group',
    'facebook_instagram_ad',
    'tiktok',
    'google_search',
    'flyer_qr',
    'partner',
    'other',
  ])
  acquisitionSourceSelfReported?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  acquisitionSourceDetail?: string;

  @IsOptional()
  @IsIn(['ready', 'needs_preparation', 'none'])
  projectPhotosReadiness?: string;

  @IsOptional()
  @IsIn(['yes', 'no'])
  serviceDescriptionReadiness?: string;
}
