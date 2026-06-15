import { BlogStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeTags(value: unknown): unknown {
  if (!Array.isArray(value)) {
    return value;
  }

  return value
    .map((tag) => trimString(tag))
    .filter((tag): tag is string => typeof tag === 'string' && tag.length > 0);
}

export class UpdateBlogPostDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  excerpt?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  cover_image?: string;

  @IsOptional()
  @IsEnum(BlogStatus)
  status?: BlogStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  artist_id?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizeTags(value))
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
