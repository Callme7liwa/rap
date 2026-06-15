import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssociateArtistUserDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  user_id!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  artist_id!: number;
}
