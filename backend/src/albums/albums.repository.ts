import { Injectable } from '@nestjs/common';
import { Album, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const albumArtistSelect = {
  id: true,
  name: true,
  slug: true,
  image_url: true,
  is_verified: true,
} satisfies Prisma.ArtistSelect;

export const albumListSelect = {
  id: true,
  name: true,
  slug: true,
  cover_art_url: true,
  release_date: true,
  artist_id: true,
  created_at: true,
  updated_at: true,
  artist: { select: albumArtistSelect },
} satisfies Prisma.AlbumSelect;

export const albumDetailSelect = {
  ...albumListSelect,
  songs: {
    select: {
      id: true,
      title: true,
      slug: true,
      song_art_image_url: true,
      release_date: true,
    },
    orderBy: { title: 'asc' },
  },
} satisfies Prisma.AlbumSelect;

export type AlbumListRecord = Prisma.AlbumGetPayload<{
  select: typeof albumListSelect;
}>;

export type AlbumDetailRecord = Prisma.AlbumGetPayload<{
  select: typeof albumDetailSelect;
}>;

@Injectable()
export class AlbumsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(params: {
    skip: number;
    take: number;
    artistId?: number;
  }): Promise<[AlbumListRecord[], number]> {
    const where: Prisma.AlbumWhereInput = params.artistId
      ? { artist_id: params.artistId }
      : {};

    return this.prisma.$transaction([
      this.prisma.album.findMany({
        where,
        skip: params.skip,
        take: params.take,
        orderBy: { created_at: 'desc' },
        select: albumListSelect,
      }),
      this.prisma.album.count({ where }),
    ]);
  }

  findDetailById(id: number): Promise<AlbumDetailRecord | null> {
    return this.prisma.album.findUnique({
      where: { id },
      select: albumDetailSelect,
    });
  }

  findByIdForOwnership(
    id: number,
  ): Promise<Pick<Album, 'id' | 'artist_id'> | null> {
    return this.prisma.album.findUnique({
      where: { id },
      select: { id: true, artist_id: true },
    });
  }

  findBySlug(slug: string): Promise<Pick<Album, 'id'> | null> {
    return this.prisma.album.findUnique({
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

  countSongs(albumId: number): Promise<number> {
    return this.prisma.song.count({
      where: { album_id: albumId },
    });
  }

  create(data: Prisma.AlbumUncheckedCreateInput): Promise<AlbumDetailRecord> {
    return this.prisma.album.create({
      data,
      select: albumDetailSelect,
    });
  }

  update(
    id: number,
    data: Prisma.AlbumUncheckedUpdateInput,
  ): Promise<AlbumDetailRecord> {
    return this.prisma.album.update({
      where: { id },
      data,
      select: albumDetailSelect,
    });
  }

  delete(id: number): Promise<AlbumDetailRecord> {
    return this.prisma.album.delete({
      where: { id },
      select: albumDetailSelect,
    });
  }
}
