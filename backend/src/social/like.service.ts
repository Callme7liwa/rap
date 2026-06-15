import { Injectable, NotFoundException } from '@nestjs/common';
import { ItemType, Prisma } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  CountResponse,
  LikedAlbumItem,
  LikedContentResponse,
  LikedSongItem,
  LikeStatusResponse,
} from './entities/social.response';
import { parseItemTypeParam } from './utils/item-type.util';

const likedContentSelect = {
  id: true,
  item_type: true,
  item_id: true,
  created_at: true,
} satisfies Prisma.LikeSelect;

const likedAlbumSelect = {
  id: true,
  name: true,
  slug: true,
  cover_art_url: true,
  release_date: true,
  artist: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.AlbumSelect;

const likedSongSelect = {
  id: true,
  title: true,
  slug: true,
  song_art_image_url: true,
  release_date: true,
  primary_artist: {
    select: {
      id: true,
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.SongSelect;

type LikedContentRecord = Prisma.LikeGetPayload<{
  select: typeof likedContentSelect;
}>;

type LikedAlbumRecord = Prisma.AlbumGetPayload<{
  select: typeof likedAlbumSelect;
}>;

type LikedSongRecord = Prisma.SongGetPayload<{
  select: typeof likedSongSelect;
}>;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class LikeService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleLike(
    type: string,
    itemId: number,
    currentUser: JwtUser,
  ): Promise<LikeStatusResponse> {
    const itemType = parseItemTypeParam(type);
    await this.ensureItemExists(itemType, itemId);

    const deleted = await this.prisma.like.deleteMany({
      where: {
        user_id: currentUser.id,
        item_type: itemType,
        item_id: itemId,
      },
    });

    if (deleted.count > 0) {
      return { liked: false };
    }

    try {
      await this.prisma.like.create({
        data: {
          user_id: currentUser.id,
          item_type: itemType,
          item_id: itemId,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    return { liked: true };
  }

  async getLikeStatus(
    type: string,
    itemId: number,
    currentUser: JwtUser,
  ): Promise<LikeStatusResponse> {
    const itemType = parseItemTypeParam(type);
    await this.ensureItemExists(itemType, itemId);

    const like = await this.prisma.like.findUnique({
      where: {
        user_id_item_type_item_id: {
          user_id: currentUser.id,
          item_type: itemType,
          item_id: itemId,
        },
      },
      select: { id: true },
    });

    return { liked: Boolean(like) };
  }

  async countLikes(type: string, itemId: number): Promise<CountResponse> {
    const itemType = parseItemTypeParam(type);
    await this.ensureItemExists(itemType, itemId);

    const count = await this.prisma.like.count({
      where: {
        item_type: itemType,
        item_id: itemId,
      },
    });

    return { count };
  }

  async findMyContent(
    currentUser: JwtUser,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<LikedContentResponse>> {
    const pagination = getPagination(query.page, query.limit);

    const [likes, total] = await this.prisma.$transaction([
      this.prisma.like.findMany({
        where: { user_id: currentUser.id },
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        select: likedContentSelect,
      }),
      this.prisma.like.count({
        where: { user_id: currentUser.id },
      }),
    ]);

    const contentById = await this.loadLikedContent(likes);

    return {
      data: likes.map((like) => ({
        like_id: like.id,
        item_type: like.item_type,
        item_id: like.item_id,
        created_at: like.created_at,
        item: contentById.get(this.buildContentKey(like.item_type, like.item_id)) ?? null,
      })),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
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

  private async loadLikedContent(
    likes: LikedContentRecord[],
  ): Promise<Map<string, LikedAlbumItem | LikedSongItem>> {
    const songIds = likes
      .filter((like) => like.item_type === ItemType.SONG)
      .map((like) => like.item_id);
    const albumIds = likes
      .filter((like) => like.item_type === ItemType.ALBUM)
      .map((like) => like.item_id);

    const [songs, albums] = await Promise.all([
      songIds.length
        ? this.prisma.song.findMany({
            where: { id: { in: songIds } },
            select: likedSongSelect,
          })
        : Promise.resolve<LikedSongRecord[]>([]),
      albumIds.length
        ? this.prisma.album.findMany({
            where: { id: { in: albumIds } },
            select: likedAlbumSelect,
          })
        : Promise.resolve<LikedAlbumRecord[]>([]),
    ]);

    const contentById = new Map<string, LikedAlbumItem | LikedSongItem>();

    for (const song of songs) {
      contentById.set(this.buildContentKey(ItemType.SONG, song.id), song);
    }

    for (const album of albums) {
      contentById.set(this.buildContentKey(ItemType.ALBUM, album.id), album);
    }

    return contentById;
  }

  private buildContentKey(itemType: ItemType, itemId: number): string {
    return `${itemType}:${itemId}`;
  }
}
