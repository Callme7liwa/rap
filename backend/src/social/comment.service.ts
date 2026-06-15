import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemType, Prisma, Role } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponse } from './entities/social.response';
import { parseItemTypeParam } from './utils/item-type.util';

const commentSelect = {
  id: true,
  item_type: true,
  item_id: true,
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
} satisfies Prisma.CommentSelect;

type CommentOwnershipRecord = {
  id: number;
  user_id: number;
  item_type: ItemType;
  item_id: number;
};

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) {}

  async createComment(
    type: string,
    itemId: number,
    dto: CreateCommentDto,
    currentUser: JwtUser,
  ): Promise<CommentResponse> {
    const itemType = parseItemTypeParam(type);
    await this.ensureItemExists(itemType, itemId);

    return this.prisma.comment.create({
      data: {
        user_id: currentUser.id,
        item_type: itemType,
        item_id: itemId,
        content: dto.content,
      },
      select: commentSelect,
    });
  }

  async findComments(
    type: string,
    itemId: number,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<CommentResponse>> {
    const itemType = parseItemTypeParam(type);
    await this.ensureItemExists(itemType, itemId);

    const pagination = getPagination(query.page, query.limit);
    const where: Prisma.CommentWhereInput = {
      item_type: itemType,
      item_id: itemId,
    };

    const [comments, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        select: commentSelect,
      }),
      this.prisma.comment.count({ where }),
    ]);

    return {
      data: comments,
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async updateComment(
    type: string,
    itemId: number,
    commentId: number,
    dto: UpdateCommentDto,
    currentUser: JwtUser,
  ): Promise<CommentResponse> {
    const itemType = parseItemTypeParam(type);
    await this.ensureItemExists(itemType, itemId);

    const comment = await this.findCommentForItem(commentId, itemType, itemId);

    if (comment.user_id !== currentUser.id) {
      throw new ForbiddenException('You can only update your own comments');
    }

    return this.prisma.comment.update({
      where: { id: comment.id },
      data: { content: dto.content },
      select: commentSelect,
    });
  }

  async deleteComment(
    type: string,
    itemId: number,
    commentId: number,
    currentUser: JwtUser,
  ): Promise<CommentResponse> {
    const itemType = parseItemTypeParam(type);
    await this.ensureItemExists(itemType, itemId);

    const comment = await this.findCommentForItem(commentId, itemType, itemId);

    if (comment.user_id !== currentUser.id && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('You cannot delete this comment');
    }

    return this.prisma.comment.delete({
      where: { id: comment.id },
      select: commentSelect,
    });
  }

  private async ensureItemExists(
    itemType: ItemType,
    itemId: number,
  ): Promise<void> {
    const item =
      itemType === ItemType.SONG
        ? await this.prisma.song.findUnique({
            where: { id: itemId },
            select: { id: true },
          })
        : await this.prisma.album.findUnique({
            where: { id: itemId },
            select: { id: true },
          });

    if (!item) {
      throw new NotFoundException('Item not found');
    }
  }

  private async findCommentForItem(
    commentId: number,
    itemType: ItemType,
    itemId: number,
  ): Promise<CommentOwnershipRecord> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        user_id: true,
        item_type: true,
        item_id: true,
      },
    });

    if (
      !comment ||
      comment.item_type !== itemType ||
      comment.item_id !== itemId
    ) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }
}
