import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SearchQueryDto, SearchType } from './dto/search-query.dto';
import {
  AlbumSearchResult,
  ArtistSearchResult,
  SearchResponse,
  SongSearchResult,
} from './entities/search.response';

const searchArtistSelect = {
  id: true,
  name: true,
  slug: true,
  image_url: true,
  is_verified: true,
} satisfies Prisma.ArtistSelect;

const searchAlbumSelect = {
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

const searchSongSelect = {
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
  album: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.SongSelect;

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQueryDto): Promise<SearchResponse> {
    const searchTerm = query.q.trim();
    const type = query.type ?? SearchType.ALL;
    const limit = query.limit ?? 5;

    const [artistResults, albumResults, songResults] = await Promise.all([
      this.searchArtists(searchTerm, limit),
      this.searchAlbums(searchTerm, limit),
      this.searchSongs(searchTerm, limit),
    ]);

    const artists =
      type === SearchType.ARTISTS || type === SearchType.ALL
        ? artistResults
        : [];
    const albums =
      type === SearchType.ALBUMS || type === SearchType.ALL ? albumResults : [];
    const songs =
      type === SearchType.SONGS || type === SearchType.ALL ? songResults : [];

    return {
      artists,
      albums,
      songs,
      meta: {
        query: searchTerm,
        total: artists.length + albums.length + songs.length,
      },
    };
  }

  private searchArtists(
    query: string,
    limit: number,
  ): Promise<ArtistSearchResult[]> {
    return this.prisma.artist.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: { name: 'asc' },
      select: searchArtistSelect,
    });
  }

  private searchAlbums(
    query: string,
    limit: number,
  ): Promise<AlbumSearchResult[]> {
    return this.prisma.album.findMany({
      where: {
        name: { contains: query, mode: 'insensitive' },
      },
      take: limit,
      orderBy: { name: 'asc' },
      select: searchAlbumSelect,
    });
  }

  private searchSongs(query: string, limit: number): Promise<SongSearchResult[]> {
    return this.prisma.song.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { lyrics: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { title: 'asc' },
      select: searchSongSelect,
    });
  }
}
