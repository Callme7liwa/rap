import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { normalizeSlug } from '../common/utils/slug.util';
import { ArtistRecord, ArtistsRepository } from './artists.repository';
import { CreateArtistDto } from './dto/create-artist.dto';
import { UpdateArtistDto } from './dto/update-artist.dto';

@Injectable()
export class ArtistsService {
  constructor(private readonly artistsRepository: ArtistsRepository) {}

  findAll(): Promise<ArtistRecord[]> {
    return this.artistsRepository.findAll();
  }

  async findOne(id: number): Promise<ArtistRecord> {
    const artist = await this.artistsRepository.findById(id);

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    return artist;
  }

  async create(dto: CreateArtistDto, currentUser: JwtUser): Promise<ArtistRecord> {
    const slug = normalizeSlug(dto.slug ?? dto.name);
    await this.ensureSlugAvailable(slug);

    const userId = this.resolveWritableUserId(dto.user_id, currentUser);
    await this.ensureUserCanBeLinked(userId);

    return this.artistsRepository.create({
      name: dto.name,
      slug,
      image_url: dto.image_url,
      header_image_url: dto.header_image_url,
      bio: dto.bio,
      is_verified: dto.is_verified,
      instagram: dto.instagram,
      twitter: dto.twitter,
      user_id: userId,
    });
  }

  async update(
    id: number,
    dto: UpdateArtistDto,
    currentUser: JwtUser,
  ): Promise<ArtistRecord> {
    const artist = await this.findOne(id);
    this.assertCanManageArtist(artist, currentUser);

    const slug = dto.slug ? normalizeSlug(dto.slug) : undefined;
    if (slug) {
      await this.ensureSlugAvailable(slug, id);
    }

    const userId =
      currentUser.role === Role.ADMIN && dto.user_id !== undefined
        ? dto.user_id
        : undefined;

    if (userId !== undefined && userId !== null) {
      await this.ensureUserCanBeLinked(userId, id);
    }

    return this.artistsRepository.update(id, {
      name: dto.name,
      slug,
      image_url: dto.image_url,
      header_image_url: dto.header_image_url,
      bio: dto.bio,
      is_verified: dto.is_verified,
      instagram: dto.instagram,
      twitter: dto.twitter,
      user_id: userId,
    });
  }

  async remove(id: number, currentUser: JwtUser): Promise<ArtistRecord> {
    const artist = await this.findOne(id);
    this.assertCanManageArtist(artist, currentUser);

    return this.artistsRepository.delete(id);
  }

  private resolveWritableUserId(
    requestedUserId: number | undefined,
    currentUser: JwtUser,
  ): number | undefined {
    if (currentUser.role === Role.ADMIN) {
      return requestedUserId;
    }

    return currentUser.id;
  }

  private assertCanManageArtist(
    artist: ArtistRecord,
    currentUser: JwtUser,
  ): void {
    if (currentUser.role === Role.ADMIN) {
      return;
    }

    if (artist.user_id !== currentUser.id) {
      throw new ForbiddenException('You can only manage your own artist profile');
    }
  }

  private async ensureSlugAvailable(
    slug: string,
    currentArtistId?: number,
  ): Promise<void> {
    const existingArtist = await this.artistsRepository.findBySlug(slug);

    if (existingArtist && existingArtist.id !== currentArtistId) {
      throw new ConflictException('Artist slug already exists');
    }
  }

  private async ensureUserCanBeLinked(
    userId: number | undefined,
    currentArtistId?: number,
  ): Promise<void> {
    if (!userId) {
      return;
    }

    const existingArtist = await this.artistsRepository.findByUserId(userId);

    if (existingArtist && existingArtist.id !== currentArtistId) {
      throw new ConflictException('User is already linked to an artist');
    }
  }
}
