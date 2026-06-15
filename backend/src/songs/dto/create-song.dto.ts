import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateSongDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  lyrics?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  song_art_image_url?: string;

  @IsOptional()
  @IsString()
  release_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  primary_artist_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  album_id?: number;
}
