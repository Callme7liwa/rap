import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class CreatePollVoteDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  nominee_id!: number;
}
