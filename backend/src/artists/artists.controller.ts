import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { ArtistRecord } from './artists.repository';
import { ArtistsService } from './artists.service';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Controller('artists')
export class ArtistsController {
  constructor(private readonly artistsService: ArtistsService) {}

  @Get()
  @Public()
  findAll(): Promise<ArtistRecord[]> {
    return this.artistsService.findAll();
  }

  @Get(':id')
  @Public()
  findOne(@Param('id', ParseIntPipe) id: number): Promise<ArtistRecord> {
    return this.artistsService.findOne(id);
  }

  @Post()
  @Roles(Role.ARTIST, Role.ADMIN)
  create(
    @Body() dto: CreateArtistDto,
    @CurrentUser() user: JwtUser,
  ): Promise<ArtistRecord> {
    return this.artistsService.create(dto, user);
  }

  @Put(':id')
  @Roles(Role.ARTIST, Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateArtistDto,
    @CurrentUser() user: JwtUser,
  ): Promise<ArtistRecord> {
    return this.artistsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(Role.ARTIST, Role.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ): Promise<ArtistRecord> {
    return this.artistsService.remove(id, user);
  }
}
