import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateArtistDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  image_url?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  header_image_url?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsBoolean()
  is_verified?: boolean;

  @IsOptional()
  @IsString()
  instagram?: string;

  @IsOptional()
  @IsString()
  twitter?: string;

  @IsOptional()
  @IsInt()
  user_id?: number;
}
