import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PollCategory, PollStatus, Prisma } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNomineeDto } from './dto/create-nominee.dto';
import { CreatePollDto } from './dto/create-poll.dto';
import { CreatePollVoteDto } from './dto/create-poll-vote.dto';
import {
  NomineeResponse,
  PollResponse,
  PollVoteResponse,
} from './entities/voting.response';

const nomineeSelect = {
  id: true,
  item_type: true,
  item_id: true,
  item_name: true,
  item_image: true,
  created_at: true,
  _count: { select: { votes: true } },
} satisfies Prisma.NomineeSelect;

const pollSelect = {
  id: true,
  title: true,
  category: true,
  period: true,
  status: true,
  starts_at: true,
  ends_at: true,
  created_at: true,
  updated_at: true,
  creator: {
    select: {
      id: true,
      email: true,
      display_name: true,
    },
  },
  nominees: {
    orderBy: { created_at: 'asc' },
    select: nomineeSelect,
  },
} satisfies Prisma.PollSelect;

const pollVoteSelect = {
  id: true,
  poll_id: true,
  nominee_id: true,
  user_id: true,
  created_at: true,
  poll: {
    select: {
      id: true,
      title: true,
      category: true,
      period: true,
      status: true,
    },
  },
  nominee: {
    select: nomineeSelect,
  },
} satisfies Prisma.PollVoteSelect;

type NomineeRecord = Prisma.NomineeGetPayload<{
  select: typeof nomineeSelect;
}>;

type PollRecord = Prisma.PollGetPayload<{
  select: typeof pollSelect;
}>;

type PollVoteRecord = Prisma.PollVoteGetPayload<{
  select: typeof pollVoteSelect;
}>;

type NomineeCreateData = {
  item_type: PollCategory;
  item_id: number;
  item_name: string;
  item_image: string | null;
};

@Injectable()
export class PollsService {
  constructor(private readonly prisma: PrismaService) {}

  async findActivePolls(): Promise<PollResponse[]> {
    const polls = await this.prisma.poll.findMany({
      where: { status: PollStatus.ACTIVE },
      orderBy: { created_at: 'desc' },
      select: pollSelect,
    });

    return polls.map((poll) => this.toPollResponse(poll));
  }

  async findOne(id: number): Promise<PollResponse> {
    const poll = await this.prisma.poll.findUnique({
      where: { id },
      select: pollSelect,
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    return this.toPollResponse(poll);
  }

  async create(dto: CreatePollDto, currentUser: JwtUser): Promise<PollResponse> {
    this.ensureValidDateRange(dto.starts_at, dto.ends_at);
    this.ensureUniqueNominees(dto.nominees);

    for (const nominee of dto.nominees) {
      if (nominee.item_type !== dto.category) {
        throw new BadRequestException('Nominee item_type must match poll category');
      }
    }

    const nominees = await Promise.all(
      dto.nominees.map((nominee) => this.resolveNomineeData(nominee)),
    );

    const poll = await this.prisma.poll.create({
      data: {
        title: dto.title,
        category: dto.category,
        period: dto.period,
        starts_at: dto.starts_at,
        ends_at: dto.ends_at,
        created_by: currentUser.id,
        nominees: {
          create: nominees,
        },
      },
      select: pollSelect,
    });

    return this.toPollResponse(poll);
  }

  async close(id: number): Promise<PollResponse> {
    await this.ensurePollExists(id);

    const poll = await this.prisma.poll.update({
      where: { id },
      data: { status: PollStatus.CLOSED },
      select: pollSelect,
    });

    return this.toPollResponse(poll);
  }

  async vote(
    pollId: number,
    dto: CreatePollVoteDto,
    currentUser: JwtUser,
  ): Promise<PollVoteResponse> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: { id: true, status: true },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }

    if (poll.status === PollStatus.CLOSED) {
      throw new BadRequestException('Cannot vote on a closed poll');
    }

    const nominee = await this.prisma.nominee.findUnique({
      where: { id: dto.nominee_id },
      select: { id: true, poll_id: true },
    });

    if (!nominee || nominee.poll_id !== pollId) {
      throw new BadRequestException('Nominee does not belong to this poll');
    }

    const existingVote = await this.prisma.pollVote.findUnique({
      where: {
        poll_id_user_id: {
          poll_id: pollId,
          user_id: currentUser.id,
        },
      },
      select: { id: true },
    });

    if (existingVote) {
      throw new ConflictException('User has already voted on this poll');
    }

    const vote = await this.prisma.pollVote.create({
      data: {
        poll_id: pollId,
        nominee_id: dto.nominee_id,
        user_id: currentUser.id,
      },
      select: pollVoteSelect,
    });

    return this.toPollVoteResponse(vote);
  }

  async findMyVote(
    pollId: number,
    currentUser: JwtUser,
  ): Promise<PollVoteResponse | null> {
    await this.ensurePollExists(pollId);

    const vote = await this.prisma.pollVote.findUnique({
      where: {
        poll_id_user_id: {
          poll_id: pollId,
          user_id: currentUser.id,
        },
      },
      select: pollVoteSelect,
    });

    return vote ? this.toPollVoteResponse(vote) : null;
  }

  async findUserVotes(currentUser: JwtUser): Promise<PollVoteResponse[]> {
    const votes = await this.prisma.pollVote.findMany({
      where: { user_id: currentUser.id },
      orderBy: { created_at: 'desc' },
      select: pollVoteSelect,
    });

    return votes.map((vote) => this.toPollVoteResponse(vote));
  }

  private ensureValidDateRange(startsAt: Date, endsAt: Date): void {
    if (endsAt <= startsAt) {
      throw new BadRequestException('ends_at must be after starts_at');
    }
  }

  private ensureUniqueNominees(nominees: CreateNomineeDto[]): void {
    const seen = new Set<string>();

    for (const nominee of nominees) {
      const key = `${nominee.item_type}:${nominee.item_id}`;

      if (seen.has(key)) {
        throw new BadRequestException('Duplicate nominee in poll');
      }

      seen.add(key);
    }
  }

  private async ensurePollExists(pollId: number): Promise<void> {
    const poll = await this.prisma.poll.findUnique({
      where: { id: pollId },
      select: { id: true },
    });

    if (!poll) {
      throw new NotFoundException('Poll not found');
    }
  }

  private async resolveNomineeData(
    nominee: CreateNomineeDto,
  ): Promise<NomineeCreateData> {
    switch (nominee.item_type) {
      case PollCategory.ARTIST:
        return this.resolveArtistNominee(nominee.item_id);
      case PollCategory.ALBUM:
        return this.resolveAlbumNominee(nominee.item_id);
      case PollCategory.SONG:
        return this.resolveSongNominee(nominee.item_id);
    }
  }

  private async resolveArtistNominee(itemId: number): Promise<NomineeCreateData> {
    const artist = await this.prisma.artist.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, image_url: true },
    });

    if (!artist) {
      throw new BadRequestException('Nominee artist does not exist');
    }

    return {
      item_type: PollCategory.ARTIST,
      item_id: artist.id,
      item_name: artist.name,
      item_image: artist.image_url,
    };
  }

  private async resolveAlbumNominee(itemId: number): Promise<NomineeCreateData> {
    const album = await this.prisma.album.findUnique({
      where: { id: itemId },
      select: { id: true, name: true, cover_art_url: true },
    });

    if (!album) {
      throw new BadRequestException('Nominee album does not exist');
    }

    return {
      item_type: PollCategory.ALBUM,
      item_id: album.id,
      item_name: album.name,
      item_image: album.cover_art_url,
    };
  }

  private async resolveSongNominee(itemId: number): Promise<NomineeCreateData> {
    const song = await this.prisma.song.findUnique({
      where: { id: itemId },
      select: { id: true, title: true, song_art_image_url: true },
    });

    if (!song) {
      throw new BadRequestException('Nominee song does not exist');
    }

    return {
      item_type: PollCategory.SONG,
      item_id: song.id,
      item_name: song.title,
      item_image: song.song_art_image_url,
    };
  }

  private toPollResponse(poll: PollRecord): PollResponse {
    return {
      id: poll.id,
      title: poll.title,
      category: poll.category,
      period: poll.period,
      status: poll.status,
      starts_at: poll.starts_at,
      ends_at: poll.ends_at,
      created_at: poll.created_at,
      updated_at: poll.updated_at,
      creator: poll.creator,
      nominees: poll.nominees.map((nominee) =>
        this.toNomineeResponse(nominee),
      ),
    };
  }

  private toPollVoteResponse(vote: PollVoteRecord): PollVoteResponse {
    return {
      id: vote.id,
      poll_id: vote.poll_id,
      nominee_id: vote.nominee_id,
      user_id: vote.user_id,
      created_at: vote.created_at,
      poll: vote.poll,
      nominee: this.toNomineeResponse(vote.nominee),
    };
  }

  private toNomineeResponse(nominee: NomineeRecord): NomineeResponse {
    return {
      id: nominee.id,
      item_type: nominee.item_type,
      item_id: nominee.item_id,
      item_name: nominee.item_name,
      item_image: nominee.item_image,
      created_at: nominee.created_at,
      votes_count: nominee._count.votes,
    };
  }
}
