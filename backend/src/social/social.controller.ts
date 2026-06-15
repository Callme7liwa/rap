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
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import {
  CommentResponse,
  CountResponse,
  FollowedArtistResponse,
  FollowStatusResponse,
  LikedContentResponse,
  LikeStatusResponse,
} from './entities/social.response';
import { FollowService } from './follow.service';
import { LikeService } from './like.service';

const USER_ROLES = [Role.USER, Role.ARTIST, Role.ADMIN] as const;

@Controller('social')
export class SocialController {
  constructor(
    private readonly followService: FollowService,
    private readonly likeService: LikeService,
    private readonly commentService: CommentService,
  ) {}

  @Post('follow/artists/:id')
  @Roles(...USER_ROLES)
  toggleArtistFollow(
    @Param('id', ParseIntPipe) artistId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<FollowStatusResponse> {
    return this.followService.toggleArtistFollow(artistId, user);
  }

  @Get('follow/artists/:id/status')
  @Roles(...USER_ROLES)
  getArtistFollowStatus(
    @Param('id', ParseIntPipe) artistId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<FollowStatusResponse> {
    return this.followService.getArtistFollowStatus(artistId, user);
  }

  @Get('follow/artists/:id/count')
  @Public()
  countArtistFollowers(
    @Param('id', ParseIntPipe) artistId: number,
  ): Promise<CountResponse> {
    return this.followService.countArtistFollowers(artistId);
  }

  @Get('follow/my-artists')
  @Roles(...USER_ROLES)
  findMyArtists(
    @CurrentUser() user: JwtUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<FollowedArtistResponse>> {
    return this.followService.findMyArtists(user, query);
  }

  @Post('likes/:type/:id')
  @Roles(...USER_ROLES)
  toggleLike(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) itemId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<LikeStatusResponse> {
    return this.likeService.toggleLike(type, itemId, user);
  }

  @Get('likes/:type/:id/status')
  @Roles(...USER_ROLES)
  getLikeStatus(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) itemId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<LikeStatusResponse> {
    return this.likeService.getLikeStatus(type, itemId, user);
  }

  @Get('likes/:type/:id/count')
  @Public()
  countLikes(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) itemId: number,
  ): Promise<CountResponse> {
    return this.likeService.countLikes(type, itemId);
  }

  @Get('likes/my-content')
  @Roles(...USER_ROLES)
  findMyContent(
    @CurrentUser() user: JwtUser,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<LikedContentResponse>> {
    return this.likeService.findMyContent(user, query);
  }

  @Post('comments/:type/:id')
  @Roles(...USER_ROLES)
  createComment(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtUser,
  ): Promise<CommentResponse> {
    return this.commentService.createComment(type, itemId, dto, user);
  }

  @Get('comments/:type/:id')
  @Public()
  findComments(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) itemId: number,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<CommentResponse>> {
    return this.commentService.findComments(type, itemId, query);
  }

  @Put('comments/:type/:id/:commentId')
  @Roles(...USER_ROLES)
  updateComment(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) itemId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: JwtUser,
  ): Promise<CommentResponse> {
    return this.commentService.updateComment(type, itemId, commentId, dto, user);
  }

  @Delete('comments/:type/:id/:commentId')
  @Roles(...USER_ROLES)
  deleteComment(
    @Param('type') type: string,
    @Param('id', ParseIntPipe) itemId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<CommentResponse> {
    return this.commentService.deleteComment(type, itemId, commentId, user);
  }
}
