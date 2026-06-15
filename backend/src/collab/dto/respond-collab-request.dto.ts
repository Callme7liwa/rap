import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString } from 'class-validator';

export type CollabResponseAction = 'approve' | 'reject';

function trimString(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export class RespondCollabRequestDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toLowerCase() : value,
  )
  @IsIn(['approve', 'reject'])
  action!: CollabResponseAction;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimString(value))
  @IsString()
  response_message?: string;
}
