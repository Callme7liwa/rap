import { PollCategory } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { normalizePollCategoryInput } from '../utils/poll-category.util';

export class VotingQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => normalizePollCategoryInput(value))
  @IsEnum(PollCategory)
  type?: PollCategory;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  period?: string;
}
