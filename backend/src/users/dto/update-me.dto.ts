import { IsOptional, IsString } from 'class-validator';

export class UpdateMeDto {
  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  avatar_url?: string;
}
