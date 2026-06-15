import { PollCategory, PollPeriod } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsEnum,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { normalizePollCategoryInput } from '../utils/poll-category.util';
import { CreateNomineeDto } from './create-nominee.dto';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class CreatePollDto {
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  @MinLength(1)
  title!: string;

  @Transform(({ value }: { value: unknown }) => normalizePollCategoryInput(value))
  @IsEnum(PollCategory)
  category!: PollCategory;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(PollPeriod)
  period!: PollPeriod;

  @Type(() => Date)
  @IsDate()
  starts_at!: Date;

  @Type(() => Date)
  @IsDate()
  ends_at!: Date;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateNomineeDto)
  nominees!: CreateNomineeDto[];
}
