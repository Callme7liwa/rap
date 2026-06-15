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
import { CollabRequestsService } from './collab-requests.service';
import { CollabSettingsService } from './collab-settings.service';
import { CollabQueryDto } from './dto/collab-query.dto';
import { CreateCollabRequestDto } from './dto/create-collab-request.dto';
import { RespondCollabRequestDto } from './dto/respond-collab-request.dto';
import { UpdateCollabSettingsDto } from './dto/update-collab-settings.dto';
import {
  CollabLimitCheckResponse,
  CollabRequestResponse,
  CollabSettingsResponse,
} from './entities/collab.response';

const USER_ROLES = [Role.USER, Role.ARTIST, Role.ADMIN] as const;

@Controller('collab-requests')
export class CollabController {
  constructor(
    private readonly requestsService: CollabRequestsService,
    private readonly settingsService: CollabSettingsService,
  ) {}

  @Post()
  @Roles(...USER_ROLES)
  create(
    @Body() dto: CreateCollabRequestDto,
    @CurrentUser() user: JwtUser,
  ): Promise<CollabRequestResponse> {
    return this.requestsService.create(dto, user);
  }

  @Get('my-requests')
  @Roles(...USER_ROLES)
  findMyRequests(
    @CurrentUser() user: JwtUser,
    @Query() query: CollabQueryDto,
  ): Promise<PaginatedResponse<CollabRequestResponse>> {
    return this.requestsService.findMyRequests(user, query);
  }

  @Get('for-artist')
  @Roles(Role.ARTIST, Role.ADMIN)
  findForArtist(
    @CurrentUser() user: JwtUser,
    @Query() query: CollabQueryDto,
  ): Promise<PaginatedResponse<CollabRequestResponse>> {
    return this.requestsService.findForArtist(user, query);
  }

  @Get('limit-check')
  @Roles(...USER_ROLES)
  checkLimit(@CurrentUser() user: JwtUser): Promise<CollabLimitCheckResponse> {
    return this.requestsService.checkLimit(user);
  }

  @Get('admin/settings')
  @Roles(Role.ADMIN)
  getSettings(): Promise<CollabSettingsResponse> {
    return this.settingsService.getSettings();
  }

  @Put('admin/settings')
  @Roles(Role.ADMIN)
  updateSettings(
    @Body() dto: UpdateCollabSettingsDto,
    @CurrentUser() user: JwtUser,
  ): Promise<CollabSettingsResponse> {
    return this.settingsService.updateSettings(dto, user.id);
  }

  @Get(':id')
  @Roles(...USER_ROLES)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ): Promise<CollabRequestResponse> {
    return this.requestsService.findOne(id, user);
  }

  @Put(':id/respond')
  @Roles(Role.ARTIST, Role.ADMIN)
  respond(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondCollabRequestDto,
    @CurrentUser() user: JwtUser,
  ): Promise<CollabRequestResponse> {
    return this.requestsService.respond(id, dto, user);
  }

  @Delete(':id')
  @Roles(...USER_ROLES)
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtUser,
  ): Promise<CollabRequestResponse> {
    return this.requestsService.cancel(id, user);
  }
}
