import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class UpdateCollabSettingsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  monthly_limit!: number;
}
