import { CollabType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

function normalizeEnum(value: unknown): unknown {
  return typeof value === 'string' ? value.toUpperCase() : value;
}

export class CreateCollabRequestDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  artist_id!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  collaborator_artist_id?: number;

  @Transform(({ value }: { value: unknown }) => normalizeEnum(value))
  @IsEnum(CollabType)
  collab_type!: CollabType;

  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MinLength(1)
  message!: string;
}
