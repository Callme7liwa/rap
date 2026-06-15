import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export enum SearchType {
  ARTISTS = 'artists',
  ALBUMS = 'albums',
  SONGS = 'songs',
  ALL = 'all',
}

export class SearchQueryDto {
  @Transform(({ value }: { value: string }) => value?.trim())
  @IsString()
  @MinLength(2)
  q!: string;

  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  limit?: number = 5;
}
