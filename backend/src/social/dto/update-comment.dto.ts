import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

export class UpdateCommentDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  content!: string;
}
