import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CountResponse,
  FollowedArtistResponse,
  FollowStatusResponse,
} from './entities/social.response';

const followedArtistSelect = {
  created_at: true,
  artist: {
    select: {
      id: true,
      name: true,
      slug: true,
      image_url: true,
      is_verified: true,
    },
  },
} satisfies Prisma.FollowSelect;

type FollowedArtistRecord = Prisma.FollowGetPayload<{
  select: typeof followedArtistSelect;
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
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async toggleArtistFollow(
    artistId: number,
    currentUser: JwtUser,
  ): Promise<FollowStatusResponse> {
    await this.ensureArtistExists(artistId);

    const deleted = await this.prisma.follow.deleteMany({
      where: {
        user_id: currentUser.id,
        artist_id: artistId,
      },
    });

    if (deleted.count > 0) {
      return { following: false };
    }

    try {
      await this.prisma.follow.create({
        data: {
          user_id: currentUser.id,
          artist_id: artistId,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    return { following: true };
  }

  async getArtistFollowStatus(
    artistId: number,
    currentUser: JwtUser,
  ): Promise<FollowStatusResponse> {
    await this.ensureArtistExists(artistId);

    const follow = await this.prisma.follow.findUnique({
      where: {
        user_id_artist_id: {
          user_id: currentUser.id,
          artist_id: artistId,
        },
      },
      select: { id: true },
    });

    return { following: Boolean(follow) };
  }

  async countArtistFollowers(artistId: number): Promise<CountResponse> {
    await this.ensureArtistExists(artistId);

    const count = await this.prisma.follow.count({
      where: { artist_id: artistId },
    });

    return { count };
  }

  async findMyArtists(
    currentUser: JwtUser,
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<FollowedArtistResponse>> {
    const pagination = getPagination(query.page, query.limit);

    const [follows, total] = await this.prisma.$transaction([
      this.prisma.follow.findMany({
        where: { user_id: currentUser.id },
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        select: followedArtistSelect,
      }),
      this.prisma.follow.count({
        where: { user_id: currentUser.id },
      }),
    ]);

    return {
      data: follows.map((follow) => this.toFollowedArtistResponse(follow)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
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

  private toFollowedArtistResponse(
    follow: FollowedArtistRecord,
  ): FollowedArtistResponse {
    return {
      id: follow.artist.id,
      name: follow.artist.name,
      slug: follow.artist.slug,
      image_url: follow.artist.image_url,
      is_verified: follow.artist.is_verified,
      followed_at: follow.created_at,
    };
  }
}
