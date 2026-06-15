import { Injectable } from '@nestjs/common';
import { Prisma, Song } from '@prisma/client';
import { albumArtistSelect } from '../albums/albums.repository';
import { PrismaService } from '../prisma/prisma.service';

export const songAlbumSelect = {
  id: true,
  name: true,
  slug: true,
  cover_art_url: true,
  release_date: true,
} satisfies Prisma.AlbumSelect;

export const songListSelect = {
  id: true,
  title: true,
  slug: true,
  lyrics: true,
  song_art_image_url: true,
  release_date: true,
  primary_artist_id: true,
  album_id: true,
  created_at: true,
  updated_at: true,
  primary_artist: { select: albumArtistSelect },
  album: { select: songAlbumSelect },
} satisfies Prisma.SongSelect;

export type SongRecord = Prisma.SongGetPayload<{
  select: typeof songListSelect;
}>;

@Injectable()
export class SongsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(params: {
    skip: number;
    take: number;
    artistId?: number;
    albumId?: number;
    q?: string;
  }): Promise<[SongRecord[], number]> {
    const where = this.buildWhereInput(params);

    return this.prisma.$transaction([
      this.prisma.song.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { created_at: 'desc' },
        select: songListSelect,
      }),
      this.prisma.song.count({ where }),
    ]);
  }

  findById(id: number): Promise<SongRecord | null> {
    return this.prisma.song.findUnique({
      where: { id },
      select: songListSelect,
    });
  }

  findByIdForOwnership(
    id: number,
  ): Promise<Pick<Song, 'id' | 'primary_artist_id' | 'album_id'> | null> {
    return this.prisma.song.findUnique({
      where: { id },
      select: { id: true, primary_artist_id: true, album_id: true },
    });
  }

  findBySlug(slug: string): Promise<Pick<Song, 'id'> | null> {
    return this.prisma.song.findUnique({
      where: { slug },
      select: { id: true },
    });
  }

  findArtistById(artistId: number): Promise<{ id: number } | null> {
    return this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true },
    });
  }

  findArtistLinkedToUser(userId: number): Promise<{ id: number } | null> {
    return this.prisma.artist.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
  }

  findAlbumById(albumId: number): Promise<{ id: number; artist_id: number } | null> {
    return this.prisma.album.findUnique({
      where: { id: albumId },
      select: { id: true, artist_id: true },
    });
  }

  create(data: Prisma.SongUncheckedCreateInput): Promise<SongRecord> {
    return this.prisma.song.create({
      data,
      select: songListSelect,
    });
  }

  update(id: number, data: Prisma.SongUncheckedUpdateInput): Promise<SongRecord> {
    return this.prisma.song.update({
      where: { id },
      data,
      select: songListSelect,
    });
  }

  delete(id: number): Promise<SongRecord> {
    return this.prisma.song.delete({
      where: { id },
      select: songListSelect,
    });
  }

  private buildWhereInput(params: {
    artistId?: number;
    albumId?: number;
    q?: string;
  }): Prisma.SongWhereInput {
    const and: Prisma.SongWhereInput[] = [];

    if (params.artistId) {
      and.push({ primary_artist_id: params.artistId });
    }

    if (params.albumId) {
      and.push({ album_id: params.albumId });
    }

    const query = params.q?.trim();
    if (query) {
      and.push({
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { lyrics: { contains: query, mode: 'insensitive' } },
          {
            primary_artist: {
              name: { contains: query, mode: 'insensitive' },
            },
          },
        ],
      });
    }

    return and.length ? { AND: and } : {};
  }
}
