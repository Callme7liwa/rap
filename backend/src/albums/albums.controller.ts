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
import { AlbumsService } from './albums.service';
import { AlbumQueryDto } from './dto/album-query.dto';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import {
  AlbumDetailResponse,
  AlbumListItemResponse,
} from './entities/album.response';

@Controller('albums')
export class AlbumsController {
  constructor(private readonly albumsService: AlbumsService) {}

  @Get()
  @Public()
  findAll(
    @Query() query: AlbumQueryDto,
  ): Promise<PaginatedResponse<AlbumListItemResponse>> {
    return this.albumsService.findAll(query);
  }

  @Get(':id')
  @Public()
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AlbumDetailResponse> {
    return this.albumsService.findOne(id);
  }

  @Post()
  @Roles(Role.ARTIST, Role.ADMIN)
  create(
    @Body() dto: CreateAlbumDto,
    @CurrentUser() user: JwtUser,
  ): Promise<AlbumDetailResponse> {
    return this.albumsService.create(dto, user);
  }

  @Put(':id')
  @Roles(Role.ARTIST, Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAlbumDto,
    @CurrentUser() user: JwtUser,
  ): Promise<AlbumDetailResponse> {
    return this.albumsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ARTIST, Role.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ): Promise<AlbumDetailResponse> {
    return this.albumsService.remove(id, user);
  }
}
