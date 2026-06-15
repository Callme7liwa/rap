import { PollCategory } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { normalizePollCategoryInput } from '../utils/poll-category.util';

export class CreateNomineeDto {
  @Transform(({ value }: { value: unknown }) => normalizePollCategoryInput(value))
  @IsEnum(PollCategory)
  item_type!: PollCategory;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  item_id!: number;
}
