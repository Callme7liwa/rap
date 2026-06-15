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
import { Roles } from '../auth/decorators/roles.decorator';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { AdminGeniusService } from './admin-genius.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminUsersService } from './admin-users.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AssociateArtistUserDto } from './dto/associate-artist-user.dto';
import { GeniusArtistUrlDto } from './dto/genius-artist-url.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import {
  AdminArtistUserAssociationResponse,
  AdminArtistUserRemovalResponse,
  AdminStatsResponse,
  AdminUserResponse,
  GeniusArtistPreviewResponse,
  GeniusArtistProfileResponse,
  GeniusArtistSyncResponse,
} from './entities/admin.response';

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly adminStatsService: AdminStatsService,
    private readonly adminGeniusService: AdminGeniusService,
  ) {}

  @Get('users')
  @Roles(Role.ADMIN)
  findUsers(
    @Query() query: AdminUsersQueryDto,
  ): Promise<PaginatedResponse<AdminUserResponse>> {
    return this.adminUsersService.findAll(query);
  }

  @Get('users/:id')
  @Roles(Role.ADMIN)
  findUser(@Param('id', ParseIntPipe) id: number): Promise<AdminUserResponse> {
    return this.adminUsersService.findOne(id);
  }

  @Put('users/:id/role')
  @Roles(Role.ADMIN)
  updateUserRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserRoleDto,
    @CurrentUser() user: JwtUser,
  ): Promise<AdminUserResponse> {
    return this.adminUsersService.updateRole(id, dto, user);
  }

  @Delete('users/:id')
  @Roles(Role.ADMIN)
  removeUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ): Promise<AdminUserResponse> {
    return this.adminUsersService.remove(id, user);
  }

  @Get('artist-users')
  @Roles(Role.ADMIN)
  findArtistUsers(): Promise<AdminArtistUserAssociationResponse[]> {
    return this.adminUsersService.findArtistUsers();
  }

  @Post('artist-users')
  @Roles(Role.ADMIN)
  associateArtistUser(
    @Body() dto: AssociateArtistUserDto,
  ): Promise<AdminArtistUserAssociationResponse> {
    return this.adminUsersService.associateArtistUser(dto);
  }

  @Delete('artist-users/:artist_id')
  @Roles(Role.ADMIN)
  removeArtistUser(
    @Param('artist_id', ParseIntPipe) artistId: number,
  ): Promise<AdminArtistUserRemovalResponse> {
    return this.adminUsersService.removeArtistAssociation(artistId);
  }

  @Get('artists/:id/genius-profile')
  @Roles(Role.ADMIN)
  getGeniusProfile(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<GeniusArtistProfileResponse | null> {
    return this.adminGeniusService.findProfile(id);
  }

  @Post('artists/:id/genius-preview')
  @Roles(Role.ADMIN)
  previewGeniusArtist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GeniusArtistUrlDto,
  ): Promise<GeniusArtistPreviewResponse> {
    return this.adminGeniusService.previewArtist(id, dto);
  }

  @Post('artists/:id/genius-sync')
  @Roles(Role.ADMIN)
  syncGeniusArtist(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GeniusArtistUrlDto,
  ): Promise<GeniusArtistSyncResponse> {
    return this.adminGeniusService.syncArtist(id, dto);
  }

  @Get('stats')
  @Roles(Role.ADMIN)
  getStats(): Promise<AdminStatsResponse> {
    return this.adminStatsService.getStats();
  }
}
