import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PollCategory, Prisma } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMonthlyVoteDto } from './dto/create-monthly-vote.dto';
import { VotingQueryDto } from './dto/voting-query.dto';
import {
  CountResponse,
  MonthlyTopItemResponse,
  MonthlyVoteResponse,
} from './entities/voting.response';
import {
  getCurrentMonthlyPeriod,
  parsePollCategory,
} from './utils/poll-category.util';

const monthlyVoteSelect = {
  id: true,
  user_id: true,
  item_type: true,
  item_id: true,
  period: true,
  created_at: true,
} satisfies Prisma.MonthlyVoteSelect;

type MonthlyItemSummary = {
  item_name: string;
  item_image: string | null;
};

@Injectable()
export class MonthlyVotingService {
  constructor(private readonly prisma: PrismaService) {}

  async vote(
    dto: CreateMonthlyVoteDto,
    currentUser: JwtUser,
  ): Promise<MonthlyVoteResponse> {
    const period = getCurrentMonthlyPeriod();
    await this.ensureItemExists(dto.item_type, dto.item_id);

    const existingVote = await this.prisma.monthlyVote.findUnique({
      where: {
        user_id_item_type_period: {
          user_id: currentUser.id,
          item_type: dto.item_type,
          period,
        },
      },
      select: { id: true },
    });

    if (existingVote) {
      throw new ConflictException(
        'User has already voted for this item type this month',
      );
    }

    return this.prisma.monthlyVote.create({
      data: {
        user_id: currentUser.id,
        item_type: dto.item_type,
        item_id: dto.item_id,
        period,
      },
      select: monthlyVoteSelect,
    });
  }

  findMyVotes(currentUser: JwtUser): Promise<MonthlyVoteResponse[]> {
    return this.prisma.monthlyVote.findMany({
      where: { user_id: currentUser.id },
      orderBy: { created_at: 'desc' },
      select: monthlyVoteSelect,
    });
  }

  async findTop(query: VotingQueryDto): Promise<MonthlyTopItemResponse[]> {
    const period = query.period ?? getCurrentMonthlyPeriod();
    const limit = query.limit ?? 20;
    const where: Prisma.MonthlyVoteWhereInput = {
      period,
      item_type: query.type,
    };

    const groupedVotes = await this.prisma.monthlyVote.groupBy({
      by: ['item_type', 'item_id', 'period'],
      where,
      _count: { id: true },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: limit,
    });

    const topItems = await Promise.all(
      groupedVotes.map(async (voteGroup) => {
        const item = await this.findItemSummary(
          voteGroup.item_type,
          voteGroup.item_id,
        );

        if (!item) {
          return null;
        }

        return {
          item_type: voteGroup.item_type,
          item_id: voteGroup.item_id,
          period: voteGroup.period,
          count: voteGroup._count.id,
          item_name: item.item_name,
          item_image: item.item_image,
        };
      }),
    );

    return topItems.filter(
      (item): item is MonthlyTopItemResponse => item !== null,
    );
  }

  async countItemVotes(
    type: string,
    itemId: number,
    query: VotingQueryDto,
  ): Promise<CountResponse> {
    const itemType = parsePollCategory(type);
    const period = query.period ?? getCurrentMonthlyPeriod();
    await this.ensureItemExists(itemType, itemId);

    const count = await this.prisma.monthlyVote.count({
      where: {
        item_type: itemType,
        item_id: itemId,
        period,
      },
    });

    return { count };
  }

  private async ensureItemExists(
    itemType: PollCategory,
    itemId: number,
  ): Promise<void> {
    const item = await this.findItemSummary(itemType, itemId);

    if (!item) {
      throw new NotFoundException('Voting item not found');
    }
  }

  private async findItemSummary(
    itemType: PollCategory,
    itemId: number,
  ): Promise<MonthlyItemSummary | null> {
    switch (itemType) {
      case PollCategory.ARTIST:
        return this.findArtistSummary(itemId);
      case PollCategory.ALBUM:
        return this.findAlbumSummary(itemId);
      case PollCategory.SONG:
        return this.findSongSummary(itemId);
    }
  }

  private async findArtistSummary(
    itemId: number,
  ): Promise<MonthlyItemSummary | null> {
    const artist = await this.prisma.artist.findUnique({
      where: { id: itemId },
      select: { name: true, image_url: true },
    });

    if (!artist) {
      return null;
    }

    return {
      item_name: artist.name,
      item_image: artist.image_url,
    };
  }

  private async findAlbumSummary(
    itemId: number,
  ): Promise<MonthlyItemSummary | null> {
    const album = await this.prisma.album.findUnique({
      where: { id: itemId },
      select: { name: true, cover_art_url: true },
    });

    if (!album) {
      return null;
    }

    return {
      item_name: album.name,
      item_image: album.cover_art_url,
    };
  }

  private async findSongSummary(
    itemId: number,
  ): Promise<MonthlyItemSummary | null> {
    const song = await this.prisma.song.findUnique({
      where: { id: itemId },
      select: { title: true, song_art_image_url: true },
    });

    if (!song) {
      return null;
    }

    return {
      item_name: song.title,
      item_image: song.song_art_image_url,
    };
  }
}
