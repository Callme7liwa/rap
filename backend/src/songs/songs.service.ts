import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtUser } from '../auth/types/jwt-user.type';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { normalizeSlug } from '../common/utils/slug.util';
import { CreateSongDto } from './dto/create-song.dto';
import { SongQueryDto } from './dto/song-query.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import {
  SongDetailResponse,
  SongListItemResponse,
} from './entities/song.response';
import { SongsRepository } from './songs.repository';

@Injectable()
export class SongsService {
  constructor(private readonly songsRepository: SongsRepository) {}

  async findAll(
    query: SongQueryDto,
  ): Promise<PaginatedResponse<SongListItemResponse>> {
    const pagination = getPagination(query.page, query.limit);
    const [songs, total] = await this.songsRepository.findMany({
      skip: pagination.skip,
      take: pagination.take,
      artistId: query.artistId,
      albumId: query.albumId,
      q: query.q,
    });

    return {
      data: songs,
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async findOne(id: number): Promise<SongDetailResponse> {
    const song = await this.songsRepository.findById(id);

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    return song;
  }

  async create(
    dto: CreateSongDto,
    currentUser: JwtUser,
  ): Promise<SongDetailResponse> {
    const artistId = await this.resolveWritableArtistId(
      dto.primary_artist_id,
      currentUser,
    );
    const slug = normalizeSlug(dto.slug ?? dto.title);

    await this.ensureArtistExists(artistId);
    await this.ensureAlbumMatchesArtist(dto.album_id, artistId);
    await this.ensureSlugAvailable(slug);

    return this.songsRepository.create({
      title: dto.title,
      slug,
      lyrics: dto.lyrics,
      song_art_image_url: dto.song_art_image_url,
      release_date: dto.release_date,
      primary_artist_id: artistId,
      album_id: dto.album_id,
    });
  }

  async update(
    id: number,
    dto: UpdateSongDto,
    currentUser: JwtUser,
  ): Promise<SongDetailResponse> {
    const song = await this.songsRepository.findByIdForOwnership(id);

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    await this.assertCanManageSong(song.primary_artist_id, currentUser);

    const slug = dto.slug ? normalizeSlug(dto.slug) : undefined;
    if (slug) {
      await this.ensureSlugAvailable(slug, id);
    }

    const nextArtistId = await this.resolveUpdateArtistId(
      song.primary_artist_id,
      dto.primary_artist_id,
      currentUser,
    );
    const effectiveArtistId = nextArtistId ?? song.primary_artist_id;

    if (dto.album_id !== undefined && dto.album_id !== null) {
      await this.ensureAlbumMatchesArtist(dto.album_id, effectiveArtistId);
    }

    return this.songsRepository.update(id, {
      title: dto.title,
      slug,
      lyrics: dto.lyrics,
      song_art_image_url: dto.song_art_image_url,
      release_date: dto.release_date,
      primary_artist_id: nextArtistId,
      album_id: dto.album_id,
    });
  }

  async remove(id: number, currentUser: JwtUser): Promise<SongDetailResponse> {
    const song = await this.songsRepository.findByIdForOwnership(id);

    if (!song) {
      throw new NotFoundException('Song not found');
    }

    await this.assertCanManageSong(song.primary_artist_id, currentUser);

    return this.songsRepository.delete(id);
  }

  private async resolveWritableArtistId(
    requestedArtistId: number | undefined,
    currentUser: JwtUser,
  ): Promise<number> {
    if (currentUser.role === Role.ADMIN) {
      if (!requestedArtistId) {
        throw new BadRequestException('primary_artist_id is required for admins');
      }

      return requestedArtistId;
    }

    const linkedArtist = await this.songsRepository.findArtistLinkedToUser(
      currentUser.id,
    );

    if (!linkedArtist) {
      throw new ForbiddenException('User is not linked to an artist');
    }

    if (requestedArtistId && requestedArtistId !== linkedArtist.id) {
      throw new ForbiddenException(
        'Artists can only use their own primary_artist_id',
      );
    }

    return linkedArtist.id;
  }

  private async resolveUpdateArtistId(
    currentArtistId: number,
    requestedArtistId: number | undefined,
    currentUser: JwtUser,
  ): Promise<number | undefined> {
    if (requestedArtistId === undefined) {
      return undefined;
    }

    if (currentUser.role !== Role.ADMIN) {
      if (requestedArtistId !== currentArtistId) {
        throw new ForbiddenException('Artists cannot move songs to another artist');
      }

      return undefined;
    }

    await this.ensureArtistExists(requestedArtistId);
    return requestedArtistId;
  }

  private async assertCanManageSong(
    artistId: number,
    currentUser: JwtUser,
  ): Promise<void> {
    if (currentUser.role === Role.ADMIN) {
      return;
    }

    const linkedArtist = await this.songsRepository.findArtistLinkedToUser(
      currentUser.id,
    );

    if (!linkedArtist || linkedArtist.id !== artistId) {
      throw new ForbiddenException('You can only manage your own artist content');
    }
  }

  private async ensureArtistExists(artistId: number): Promise<void> {
    const artist = await this.songsRepository.findArtistById(artistId);

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
  }

  private async ensureAlbumMatchesArtist(
    albumId: number | undefined,
    artistId: number,
  ): Promise<void> {
    if (!albumId) {
      return;
    }

    const album = await this.songsRepository.findAlbumById(albumId);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    if (album.artist_id !== artistId) {
      throw new BadRequestException(
        'album_id must belong to the selected primary_artist_id',
      );
    }
  }

  private async ensureSlugAvailable(
    slug: string,
    currentSongId?: number,
  ): Promise<void> {
    const song = await this.songsRepository.findBySlug(slug);

    if (song && song.id !== currentSongId) {
      throw new ConflictException('Song slug already exists');
    }
  }
}
