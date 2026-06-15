import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogStatus, Prisma, Role } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { normalizeSlug } from '../common/utils/slug.util';
import { PrismaService } from '../prisma/prisma.service';
import { BlogQueryDto } from './dto/blog-query.dto';
import { CreateBlogPostDto } from './dto/create-blog-post.dto';
import { UpdateBlogPostDto } from './dto/update-blog-post.dto';
import {
  BlogDetailResponse,
  BlogListItemResponse,
} from './entities/blog.response';

const blogAuthorSelect = {
  id: true,
  email: true,
  display_name: true,
  avatar_url: true,
  role: true,
} satisfies Prisma.UserSelect;

const blogArtistSelect = {
  id: true,
  name: true,
  slug: true,
  image_url: true,
  is_verified: true,
} satisfies Prisma.ArtistSelect;

const blogCountSelect = {
  likes: true,
  saves: true,
  comments: true,
} satisfies Prisma.BlogPostCountOutputTypeSelect;

const blogListSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  cover_image: true,
  status: true,
  tags: true,
  published_at: true,
  created_at: true,
  updated_at: true,
  artist_id: true,
  author_id: true,
  artist: { select: blogArtistSelect },
  author: { select: blogAuthorSelect },
  _count: { select: blogCountSelect },
} satisfies Prisma.BlogPostSelect;

const blogDetailSelect = {
  ...blogListSelect,
  content: true,
} satisfies Prisma.BlogPostSelect;

type BlogListRecord = Prisma.BlogPostGetPayload<{
  select: typeof blogListSelect;
}>;

type BlogDetailRecord = Prisma.BlogPostGetPayload<{
  select: typeof blogDetailSelect;
}>;

type BlogOwnershipRecord = Pick<
  BlogDetailRecord,
  'id' | 'artist_id' | 'published_at' | 'status'
>;

@Injectable()
export class BlogPostsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: BlogQueryDto,
  ): Promise<PaginatedResponse<BlogListItemResponse>> {
    const pagination = getPagination(query.page, query.limit);
    const where = this.buildPublishedWhere(query);

    const [posts, total] = await this.prisma.$transaction([
      this.prisma.blogPost.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { published_at: 'desc' },
        select: blogListSelect,
      }),
      this.prisma.blogPost.count({ where }),
    ]);

    return {
      data: posts.map((post) => this.toListResponse(post)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async findOne(slug: string): Promise<BlogDetailResponse> {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        status: BlogStatus.PUBLISHED,
      },
      select: blogDetailSelect,
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    return this.toDetailResponse(post);
  }

  async findOneForEdit(
    slug: string,
    currentUser: JwtUser,
  ): Promise<BlogDetailResponse> {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      select: blogDetailSelect,
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    await this.assertCanManagePost(post.artist_id, currentUser);

    return this.toDetailResponse(post);
  }

  async create(
    dto: CreateBlogPostDto,
    currentUser: JwtUser,
  ): Promise<BlogDetailResponse> {
    const artistId = await this.resolveWritableArtistId(
      dto.artist_id,
      currentUser,
    );
    const status = dto.status ?? BlogStatus.DRAFT;
    const slug = await this.generateUniqueSlug(dto.title);

    const post = await this.prisma.blogPost.create({
      data: {
        slug,
        title: dto.title,
        excerpt: dto.excerpt,
        content: dto.content,
        cover_image: dto.cover_image,
        status,
        author_id: currentUser.id,
        artist_id: artistId,
        tags: dto.tags ?? [],
        published_at: status === BlogStatus.PUBLISHED ? new Date() : undefined,
      },
      select: blogDetailSelect,
    });

    return this.toDetailResponse(post);
  }

  async update(
    slug: string,
    dto: UpdateBlogPostDto,
    currentUser: JwtUser,
  ): Promise<BlogDetailResponse> {
    const existingPost = await this.findPostForOwnership(slug);
    await this.assertCanManagePost(existingPost.artist_id, currentUser);

    const nextArtistId = await this.resolveUpdateArtistId(
      existingPost.artist_id,
      dto.artist_id,
      currentUser,
    );
    const data = this.buildUpdateData(dto, existingPost);

    if (nextArtistId !== undefined) {
      data.artist_id = nextArtistId;
    }

    const post = await this.prisma.blogPost.update({
      where: { slug },
      data,
      select: blogDetailSelect,
    });

    return this.toDetailResponse(post);
  }

  async remove(
    slug: string,
    currentUser: JwtUser,
  ): Promise<BlogDetailResponse> {
    const existingPost = await this.findPostForOwnership(slug);
    await this.assertCanManagePost(existingPost.artist_id, currentUser);

    const post = await this.prisma.blogPost.delete({
      where: { slug },
      select: blogDetailSelect,
    });

    return this.toDetailResponse(post);
  }

  private buildPublishedWhere(query: BlogQueryDto): Prisma.BlogPostWhereInput {
    const where: Prisma.BlogPostWhereInput = {
      status: BlogStatus.PUBLISHED,
    };

    if (query.artistId) {
      where.artist_id = query.artistId;
    }

    const tag = query.tag?.trim();
    if (tag) {
      where.tags = { has: tag };
    }

    return where;
  }

  private async generateUniqueSlug(title: string): Promise<string> {
    const baseSlug = normalizeSlug(title);
    const existingPost = await this.prisma.blogPost.findUnique({
      where: { slug: baseSlug },
      select: { id: true },
    });

    if (!existingPost) {
      return baseSlug;
    }

    let timestamp = Date.now();
    let slug = `${baseSlug}-${timestamp}`;

    while (
      await this.prisma.blogPost.findUnique({
        where: { slug },
        select: { id: true },
      })
    ) {
      timestamp += 1;
      slug = `${baseSlug}-${timestamp}`;
    }

    return slug;
  }

  private async resolveWritableArtistId(
    requestedArtistId: number,
    currentUser: JwtUser,
  ): Promise<number> {
    await this.ensureArtistExists(requestedArtistId);

    if (currentUser.role === Role.ADMIN) {
      return requestedArtistId;
    }

    const linkedArtist = await this.findArtistLinkedToUser(currentUser.id);

    if (!linkedArtist || linkedArtist.id !== requestedArtistId) {
      throw new ForbiddenException(
        'Artists can only create posts for their own artist profile',
      );
    }

    return requestedArtistId;
  }

  private async resolveUpdateArtistId(
    currentArtistId: number,
    requestedArtistId: number | undefined,
    currentUser: JwtUser,
  ): Promise<number | undefined> {
    if (requestedArtistId === undefined) {
      return undefined;
    }

    await this.ensureArtistExists(requestedArtistId);

    if (currentUser.role === Role.ADMIN) {
      return requestedArtistId;
    }

    if (requestedArtistId !== currentArtistId) {
      throw new ForbiddenException('Artists cannot move posts to another artist');
    }

    return undefined;
  }

  private buildUpdateData(
    dto: UpdateBlogPostDto,
    existingPost: BlogOwnershipRecord,
  ): Prisma.BlogPostUncheckedUpdateInput {
    const data: Prisma.BlogPostUncheckedUpdateInput = {
      title: dto.title,
      excerpt: dto.excerpt,
      content: dto.content,
      cover_image: dto.cover_image,
      status: dto.status,
      tags: dto.tags,
    };

    if (
      dto.status === BlogStatus.PUBLISHED &&
      existingPost.status !== BlogStatus.PUBLISHED &&
      !existingPost.published_at
    ) {
      data.published_at = new Date();
    }

    return data;
  }

  private async findPostForOwnership(
    slug: string,
  ): Promise<BlogOwnershipRecord> {
    const post = await this.prisma.blogPost.findUnique({
      where: { slug },
      select: {
        id: true,
        artist_id: true,
        status: true,
        published_at: true,
      },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    return post;
  }

  private async assertCanManagePost(
    artistId: number,
    currentUser: JwtUser,
  ): Promise<void> {
    if (currentUser.role === Role.ADMIN) {
      return;
    }

    const linkedArtist = await this.findArtistLinkedToUser(currentUser.id);

    if (!linkedArtist || linkedArtist.id !== artistId) {
      throw new ForbiddenException('You can only manage your own blog posts');
    }
  }

  private async ensureArtistExists(artistId: number): Promise<void> {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
  }

  private findArtistLinkedToUser(userId: number): Promise<{ id: number } | null> {
    return this.prisma.artist.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
  }

  private toListResponse(post: BlogListRecord): BlogListItemResponse {
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      cover_image: post.cover_image,
      status: post.status,
      tags: post.tags,
      published_at: post.published_at,
      created_at: post.created_at,
      updated_at: post.updated_at,
      artist: post.artist,
      author: post.author,
      counts: {
        likes: post._count.likes,
        saves: post._count.saves,
        comments: post._count.comments,
      },
    };
  }

  private toDetailResponse(post: BlogDetailRecord): BlogDetailResponse {
    return {
      ...this.toListResponse(post),
      content: post.content,
    };
  }
}
