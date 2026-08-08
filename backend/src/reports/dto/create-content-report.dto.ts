import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateContentReportDto {
  @IsIn(['worker_profile', 'request', 'media'])
  targetType: 'worker_profile' | 'request' | 'media';

  @IsInt()
  @Min(1)
  targetId: number;

  @IsIn(['spam', 'misleading', 'inappropriate', 'privacy', 'other'])
  category: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  details?: string;
}
