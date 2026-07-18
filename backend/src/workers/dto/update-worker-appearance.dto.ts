import { IsString, MaxLength } from 'class-validator';

export class UpdateWorkerAppearanceDto {
  @IsString()
  @MaxLength(64)
  profileBannerKey: string;
}
