import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class NewsPreferencesDto {
  @IsBoolean()
  newsOptIn: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;
}
