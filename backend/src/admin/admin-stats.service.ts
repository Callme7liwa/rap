import { Injectable } from '@nestjs/common';
import { BlogStatus, CollabStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AdminStatsResponse } from './entities/admin.response';

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(): Promise<AdminStatsResponse> {
    const [
      usersTotal,
      usersByRole,
      artistsTotal,
      verifiedArtists,
      albumsTotal,
      songsTotal,
      blogTotalPosts,
      blogPublishedPosts,
      collabRequestsTotal,
      collabRequestsByStatus,
      totalPollVotes,
      totalMonthlyVotes,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      this.prisma.artist.count(),
      this.prisma.artist.count({ where: { is_verified: true } }),
      this.prisma.album.count(),
      this.prisma.song.count(),
      this.prisma.blogPost.count(),
      this.prisma.blogPost.count({ where: { status: BlogStatus.PUBLISHED } }),
      this.prisma.collabRequest.count(),
      this.prisma.collabRequest.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.pollVote.count(),
      this.prisma.monthlyVote.count(),
    ]);

    return {
      users: {
        total: usersTotal,
        by_role: this.buildRoleCounts(usersByRole),
      },
      artists: {
        total: artistsTotal,
        verified: verifiedArtists,
      },
      albums: {
        total: albumsTotal,
      },
      songs: {
        total: songsTotal,
      },
      blog: {
        total_posts: blogTotalPosts,
        published: blogPublishedPosts,
      },
      collab_requests: {
        total: collabRequestsTotal,
        by_status: this.buildCollabStatusCounts(collabRequestsByStatus),
      },
      votes: {
        total_poll_votes: totalPollVotes,
        total_monthly_votes: totalMonthlyVotes,
      },
    };
  }

  private buildRoleCounts(
    rows: Array<{ role: Role; _count: { id: number } }>,
  ): Record<Role, number> {
    const counts: Record<Role, number> = {
      [Role.USER]: 0,
      [Role.ARTIST]: 0,
      [Role.ADMIN]: 0,
    };

    for (const row of rows) {
      counts[row.role] = row._count.id;
    }

    return counts;
  }

  private buildCollabStatusCounts(
    rows: Array<{ status: CollabStatus; _count: { id: number } }>,
  ): Record<CollabStatus, number> {
    const counts: Record<CollabStatus, number> = {
      [CollabStatus.PENDING]: 0,
      [CollabStatus.PARTIALLY_APPROVED]: 0,
      [CollabStatus.APPROVED]: 0,
      [CollabStatus.REJECTED]: 0,
      [CollabStatus.CANCELLED]: 0,
      [CollabStatus.COMPLETED]: 0,
    };

    for (const row of rows) {
      counts[row.status] = row._count.id;
    }

    return counts;
  }
}
