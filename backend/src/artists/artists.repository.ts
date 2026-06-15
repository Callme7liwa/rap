import { Injectable } from '@nestjs/common';
import { Artist, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const artistSelect = {
  id: true,
  name: true,
  slug: true,
  image_url: true,
  header_image_url: true,
  bio: true,
  is_verified: true,
  instagram: true,
  twitter: true,
  created_at: true,
  updated_at: true,
  user_id: true,
} satisfies Prisma.ArtistSelect;

export type ArtistRecord = Prisma.ArtistGetPayload<{
  select: typeof artistSelect;
}>;

@Injectable()
export class ArtistsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<ArtistRecord[]> {
    return this.prisma.artist.findMany({
      orderBy: { name: 'asc' },
      select: artistSelect,
    });
  }

  findById(id: number): Promise<ArtistRecord | null> {
    return this.prisma.artist.findUnique({
      where: { id },
      select: artistSelect,
    });
  }

  findBySlug(slug: string): Promise<Pick<Artist, 'id'> | null> {
    return this.prisma.artist.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  findByUserId(userId: number): Promise<Pick<Artist, 'id'> | null> {
    return this.prisma.artist.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
  }

  create(data: Prisma.ArtistUncheckedCreateInput): Promise<ArtistRecord> {
    return this.prisma.artist.create({
      data,
      select: artistSelect,
    });
  }

  update(
    id: number,
    data: Prisma.ArtistUncheckedUpdateInput,
  ): Promise<ArtistRecord> {
    return this.prisma.artist.update({
      where: { id },
      data,
      select: artistSelect,
    });
  }

  delete(id: number): Promise<ArtistRecord> {
    return this.prisma.artist.delete({
      where: { id },
      select: artistSelect,
    });
  }
}
