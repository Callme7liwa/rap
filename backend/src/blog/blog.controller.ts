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
import { BlogInteractionsService } from './blog-interactions.service';
import { BlogPostsService } from './blog-posts.service';
import { BlogQueryDto } from './dto/blog-query.dto';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import {
  BlogCommentResponse,
  BlogDetailResponse,
  BlogLikeResponse,
  BlogListItemResponse,
  BlogSaveResponse,
  BlogStatusResponse,
} from './entities/blog.response';

const USER_ROLES = [Role.USER, Role.ARTIST, Role.ADMIN] as const;

@Controller('blog')
export class BlogController {
  constructor(
    private readonly blogPostsService: BlogPostsService,
    private readonly blogInteractionsService: BlogInteractionsService,
  ) {}

  @Get()
  @Public()
  findAll(
    @Query() query: BlogQueryDto,
  ): Promise<PaginatedResponse<BlogListItemResponse>> {
    return this.blogPostsService.findAll(query);
  }

  @Get(':slug/edit')
  @Roles(Role.ARTIST, Role.ADMIN)
  findOneForEdit(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogDetailResponse> {
    return this.blogPostsService.findOneForEdit(slug, user);
  }

  @Get(':slug')
  @Public()
  findOne(@Param('slug') slug: string): Promise<BlogDetailResponse> {
    return this.blogPostsService.findOne(slug);
  }

  @Post()
  @Roles(Role.ARTIST, Role.ADMIN)
  create(
    @Body() dto: CreateBlogPostDto,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogDetailResponse> {
    return this.blogPostsService.create(dto, user);
  }

  @Put(':slug')
  @Roles(Role.ARTIST, Role.ADMIN)
  update(
    @Param('slug') slug: string,
    @Body() dto: UpdateBlogPostDto,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogDetailResponse> {
    return this.blogPostsService.update(slug, dto, user);
  }

  @Delete(':slug')
  @Roles(Role.ARTIST, Role.ADMIN)
  remove(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogDetailResponse> {
    return this.blogPostsService.remove(slug, user);
  }

  @Post(':slug/like')
  @Roles(...USER_ROLES)
  toggleLike(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogLikeResponse> {
    return this.blogInteractionsService.toggleLike(slug, user);
  }

  @Post(':slug/save')
  @Roles(...USER_ROLES)
  toggleSave(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogSaveResponse> {
    return this.blogInteractionsService.toggleSave(slug, user);
  }

  @Get(':slug/status')
  @Roles(...USER_ROLES)
  getStatus(
    @Param('slug') slug: string,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogStatusResponse> {
    return this.blogInteractionsService.getStatus(slug, user);
  }

  @Post(':slug/comments')
  @Roles(...USER_ROLES)
  createComment(
    @Param('slug') slug: string,
    @Body() dto: CreateBlogCommentDto,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogCommentResponse> {
    return this.blogInteractionsService.createComment(slug, dto, user);
  }

  @Get(':slug/comments')
  @Public()
  findComments(
    @Param('slug') slug: string,
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponse<BlogCommentResponse>> {
    return this.blogInteractionsService.findComments(slug, query);
  }

  @Delete(':slug/comments/:commentId')
  @Roles(...USER_ROLES)
  deleteComment(
    @Param('slug') slug: string,
    @Param('commentId', ParseIntPipe) commentId: number,
    @CurrentUser() user: JwtUser,
  ): Promise<BlogCommentResponse> {
    return this.blogInteractionsService.deleteComment(slug, commentId, user);
  }
}
