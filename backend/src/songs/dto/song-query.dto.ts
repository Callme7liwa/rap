import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class SongQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  artistId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  albumId?: number;

  @IsOptional()
  @IsString()
  q?: string;
}
