import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class CreateAlbumDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  cover_art_url?: string;

  @IsOptional()
  @IsString()
  release_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  artist_id?: number;
}
