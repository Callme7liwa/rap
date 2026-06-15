import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum } from 'class-validator';

export class UpdateUserRoleDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(Role)
  role!: Role;
}
