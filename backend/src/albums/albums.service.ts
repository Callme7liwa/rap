import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtUser } from '../auth/types/jwt-user.type';
import {
  PaginatedResponse,
} from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { normalizeSlug } from '../common/utils/slug.util';
import {
  AlbumDetailResponse,
  AlbumListItemResponse,
} from './entities/album.response';
import { AlbumQueryDto } from './dto/album-query.dto';
import { CreateAlbumDto } from './dto/create-album.dto';
import { UpdateAlbumDto } from './dto/update-album.dto';
import { AlbumsRepository } from './albums.repository';

@Injectable()
export class AlbumsService {
  constructor(private readonly albumsRepository: AlbumsRepository) {}

  async findAll(
    query: AlbumQueryDto,
  ): Promise<PaginatedResponse<AlbumListItemResponse>> {
    const pagination = getPagination(query.page, query.limit);
    const [albums, total] = await this.albumsRepository.findMany({
      skip: pagination.skip,
      take: pagination.take,
      artistId: query.artistId,
    });

    return {
      data: albums,
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async findOne(id: number): Promise<AlbumDetailResponse> {
    const album = await this.albumsRepository.findDetailById(id);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    return album;
  }

  async create(
    dto: CreateAlbumDto,
    currentUser: JwtUser,
  ): Promise<AlbumDetailResponse> {
    const artistId = await this.resolveWritableArtistId(
      dto.artist_id,
      currentUser,
    );
    const slug = normalizeSlug(dto.slug ?? dto.name);

    await this.ensureArtistExists(artistId);
    await this.ensureSlugAvailable(slug);

    return this.albumsRepository.create({
      name: dto.name,
      slug,
      cover_art_url: dto.cover_art_url,
      release_date: dto.release_date,
      artist_id: artistId,
    });
  }

  async update(
    id: number,
    dto: UpdateAlbumDto,
    currentUser: JwtUser,
  ): Promise<AlbumDetailResponse> {
    const album = await this.albumsRepository.findByIdForOwnership(id);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    await this.assertCanManageAlbum(album.artist_id, currentUser);

    const slug = dto.slug ? normalizeSlug(dto.slug) : undefined;
    if (slug) {
      await this.ensureSlugAvailable(slug, id);
    }

    const nextArtistId = await this.resolveUpdateArtistId(
      album.artist_id,
      dto.artist_id,
      currentUser,
    );

    return this.albumsRepository.update(id, {
      name: dto.name,
      slug,
      cover_art_url: dto.cover_art_url,
      release_date: dto.release_date,
      artist_id: nextArtistId,
    });
  }

  async remove(id: number, currentUser: JwtUser): Promise<AlbumDetailResponse> {
    const album = await this.albumsRepository.findByIdForOwnership(id);

    if (!album) {
      throw new NotFoundException('Album not found');
    }

    await this.assertCanManageAlbum(album.artist_id, currentUser);

    const songsCount = await this.albumsRepository.countSongs(id);
    if (songsCount > 0) {
      throw new BadRequestException('Cannot delete an album that has songs');
    }

    return this.albumsRepository.delete(id);
  }

  private async resolveWritableArtistId(
    requestedArtistId: number | undefined,
    currentUser: JwtUser,
  ): Promise<number> {
    if (currentUser.role === Role.ADMIN) {
      if (!requestedArtistId) {
        throw new BadRequestException('artist_id is required for admins');
      }

      return requestedArtistId;
    }

    const linkedArtist = await this.albumsRepository.findArtistLinkedToUser(
      currentUser.id,
    );

    if (!linkedArtist) {
      throw new ForbiddenException('User is not linked to an artist');
    }

    if (requestedArtistId && requestedArtistId !== linkedArtist.id) {
      throw new ForbiddenException('Artists can only use their own artist_id');
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
        throw new ForbiddenException('Artists cannot move albums to another artist');
      }

      return undefined;
    }

    await this.ensureArtistExists(requestedArtistId);
    return requestedArtistId;
  }

  private async assertCanManageAlbum(
    artistId: number,
    currentUser: JwtUser,
  ): Promise<void> {
    if (currentUser.role === Role.ADMIN) {
      return;
    }

    const linkedArtist = await this.albumsRepository.findArtistLinkedToUser(
      currentUser.id,
    );

    if (!linkedArtist || linkedArtist.id !== artistId) {
      throw new ForbiddenException('You can only manage your own artist content');
    }
  }

  private async ensureArtistExists(artistId: number): Promise<void> {
    const artist = await this.albumsRepository.findArtistById(artistId);

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
  }

  private async ensureSlugAvailable(
    slug: string,
    currentAlbumId?: number,
  ): Promise<void> {
    const album = await this.albumsRepository.findBySlug(slug);

    if (album && album.id !== currentAlbumId) {
      throw new ConflictException('Album slug already exists');
    }
  }
}
