import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class UpdateSongDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  lyrics?: string | null;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  song_art_image_url?: string | null;

  @IsOptional()
  @IsString()
  release_date?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  primary_artist_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  album_id?: number | null;
}
