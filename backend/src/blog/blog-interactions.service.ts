import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BlogStatus, Prisma, Role } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBlogCommentDto } from './dto/create-blog-comment.dto';
import {
  BlogCommentResponse,
  BlogLikeResponse,
  BlogSaveResponse,
  BlogStatusResponse,
} from './entities/blog.response';

const blogCommentSelect = {
  id: true,
  post_id: true,
  content: true,
  created_at: true,
  updated_at: true,
  user: {
    select: {
      id: true,
      display_name: true,
      avatar_url: true,
    },
  },
} satisfies Prisma.BlogCommentSelect;

type BlogCommentOwnershipRecord = {
  id: number;
  user_id: number;
  post_id: number;
};

@Injectable()
export class BlogInteractionsService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleLike(
    slug: string,
    currentUser: JwtUser,
  ): Promise<BlogLikeResponse> {
    const post = await this.findPublishedPostBySlug(slug);
    const existingLike = await this.prisma.blogLike.findUnique({
      where: {
        user_id_post_id: {
          user_id: currentUser.id,
          post_id: post.id,
        },
      },
      select: { id: true },
    });

    if (existingLike) {
      await this.prisma.blogLike.delete({
        where: { id: existingLike.id },
      });

      return {
        liked: false,
        count: await this.countLikes(post.id),
      };
    }

    await this.prisma.blogLike.create({
      data: {
        user_id: currentUser.id,
        post_id: post.id,
      },
    });

    return {
      liked: true,
      count: await this.countLikes(post.id),
    };
  }

  async toggleSave(
    slug: string,
    currentUser: JwtUser,
  ): Promise<BlogSaveResponse> {
    const post = await this.findPublishedPostBySlug(slug);
    const existingSave = await this.prisma.blogSave.findUnique({
      where: {
        user_id_post_id: {
          user_id: currentUser.id,
          post_id: post.id,
        },
      },
      select: { id: true },
    });

    if (existingSave) {
      await this.prisma.blogSave.delete({
        where: { id: existingSave.id },
      });

      return {
        saved: false,
        count: await this.countSaves(post.id),
      };
    }

    await this.prisma.blogSave.create({
      data: {
        user_id: currentUser.id,
        post_id: post.id,
      },
    });

    return {
      saved: true,
      count: await this.countSaves(post.id),
    };
  }

  async getStatus(
    slug: string,
    currentUser: JwtUser,
  ): Promise<BlogStatusResponse> {
    const post = await this.findPublishedPostBySlug(slug);
    const [like, save] = await Promise.all([
      this.prisma.blogLike.findUnique({
        where: {
          user_id_post_id: {
            user_id: currentUser.id,
            post_id: post.id,
          },
        },
        select: { id: true },
      }),
      this.prisma.blogSave.findUnique({
        where: {
          user_id_post_id: {
            user_id: currentUser.id,
            post_id: post.id,
          },
        },
        select: { id: true },
      }),
    ]);

    return {
      liked: Boolean(like),
      saved: Boolean(save),
    };
  }

  async createComment(
    slug: string,
    dto: CreateBlogCommentDto,
    currentUser: JwtUser,
  ): Promise<BlogCommentResponse> {
    const post = await this.findPublishedPostBySlug(slug);

    return this.prisma.blogComment.create({
      data: {
        post_id: post.id,
        user_id: currentUser.id,
        content: dto.content,
      },
      select: blogCommentSelect,
    });
  }

  async findComments(
    slug: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<BlogCommentResponse>> {
    const post = await this.findPublishedPostBySlug(slug);
    const pagination = getPagination(query.page, query.limit);
    const where: Prisma.BlogCommentWhereInput = { post_id: post.id };

    const [comments, total] = await this.prisma.$transaction([
      this.prisma.blogComment.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        select: blogCommentSelect,
      }),
      this.prisma.blogComment.count({ where }),
    ]);

    return {
      data: comments,
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async deleteComment(
    slug: string,
    commentId: number,
    currentUser: JwtUser,
  ): Promise<BlogCommentResponse> {
    const post = await this.findPublishedPostBySlug(slug);
    const comment = await this.findCommentForPost(commentId, post.id);

    if (comment.user_id !== currentUser.id && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You cannot delete this comment');
    }

    return this.prisma.blogComment.delete({
      where: { id: comment.id },
      select: blogCommentSelect,
    });
  }

  private async findPublishedPostBySlug(
    slug: string,
  ): Promise<{ id: number }> {
    const post = await this.prisma.blogPost.findFirst({
      where: {
        slug,
        status: BlogStatus.PUBLISHED,
      },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Blog post not found');
    }

    return post;
  }

  private async findCommentForPost(
    commentId: number,
    postId: number,
  ): Promise<BlogCommentOwnershipRecord> {
    const comment = await this.prisma.blogComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        user_id: true,
        post_id: true,
      },
    });

    if (!comment || comment.post_id !== postId) {
      throw new NotFoundException('Blog comment not found');
    }

    return comment;
  }

  private countLikes(postId: number): Promise<number> {
    return this.prisma.blogLike.count({
      where: { post_id: postId },
    });
  }

  private countSaves(postId: number): Promise<number> {
    return this.prisma.blogSave.count({
      where: { post_id: postId },
    });
  }
}
