import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CreateSongDto } from './dto/create-song.dto';
import { SongQueryDto } from './dto/song-query.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import {
  SongDetailResponse,
  SongListItemResponse,
} from './entities/song.response';
import { SongsService } from './songs.service';

@Controller('songs')
export class SongsController {
  constructor(private readonly songsService: SongsService) {}

  @Get()
  @Public()
  findAll(
    @Query() query: SongQueryDto,
  ): Promise<PaginatedResponse<SongListItemResponse>> {
    return this.songsService.findAll(query);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number): Promise<SongDetailResponse> {
    return this.songsService.findOne(id);
  }

  @Post()
  @Roles(Role.ARTIST, Role.ADMIN)
  create(
    @Body() dto: CreateSongDto,
    @CurrentUser() user: JwtUser,
  ): Promise<SongDetailResponse> {
    return this.songsService.create(dto, user);
  }

  @Put(':id')
  @Roles(Role.ARTIST, Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSongDto,
    @CurrentUser() user: JwtUser,
  ): Promise<SongDetailResponse> {
    return this.songsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ARTIST, Role.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ): Promise<SongDetailResponse> {
    return this.songsService.remove(id, user);
  }
}
