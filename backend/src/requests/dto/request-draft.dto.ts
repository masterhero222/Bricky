import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestDraftDto {
  @IsString()
  @MaxLength(2000)
  prompt: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;
}
