import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AssociateArtistUserDto } from './dto/associate-artist-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import {
  AdminArtistUserAssociationResponse,
  AdminArtistUserRemovalResponse,
  AdminUserResponse,
} from './entities/admin.response';

const adminArtistSummarySelect = {
  id: true,
  name: true,
  slug: true,
  image_url: true,
  is_verified: true,
} satisfies Prisma.ArtistSelect;

const adminUserSelect = {
  id: true,
  email: true,
  display_name: true,
  bio: true,
  avatar_url: true,
  role: true,
  created_at: true,
  updated_at: true,
  artist: { select: adminArtistSummarySelect },
} satisfies Prisma.UserSelect;

const adminArtistUserAssociationSelect = {
  id: true,
  name: true,
  slug: true,
  image_url: true,
  is_verified: true,
  user_id: true,
  user: {
    select: {
      id: true,
      email: true,
      display_name: true,
      role: true,
    },
  },
} satisfies Prisma.ArtistSelect;

type AdminUserRecord = Prisma.UserGetPayload<{
  select: typeof adminUserSelect;
}>;

type AdminArtistUserAssociationRecord = Prisma.ArtistGetPayload<{
  select: typeof adminArtistUserAssociationSelect;
}>;

@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: AdminUsersQueryDto,
  ): Promise<PaginatedResponse<AdminUserResponse>> {
    const pagination = getPagination(query.page, query.limit);
    const where = this.buildUserWhere(query);

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        select: adminUserSelect,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users.map((user) => this.toUserResponse(user)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async findOne(id: number): Promise<AdminUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserResponse(user);
  }

  async updateRole(
    id: number,
    dto: UpdateUserRoleDto,
    currentUser: JwtUser,
  ): Promise<AdminUserResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      currentUser.id === id &&
      user.role === Role.ADMIN &&
      dto.role !== Role.ADMIN
    ) {
      throw new ForbiddenException('Cannot remove your own admin role');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data: { role: dto.role },
      select: adminUserSelect,
    });

    return this.toUserResponse(updatedUser);
  }

  async remove(id: number, currentUser: JwtUser): Promise<AdminUserResponse> {
    if (currentUser.id === id) {
      throw new ForbiddenException('Cannot delete your own admin account');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: adminUserSelect,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction([
      this.prisma.poll.deleteMany({ where: { created_by: id } }),
      this.prisma.user.delete({ where: { id } }),
    ]);

    return this.toUserResponse(user);
  }

  async findArtistUsers(): Promise<AdminArtistUserAssociationResponse[]> {
    const associations = await this.prisma.artist.findMany({
      where: { user_id: { not: null } },
      orderBy: { name: 'asc' },
      select: adminArtistUserAssociationSelect,
    });

    return associations.map((association) =>
      this.toArtistUserAssociationResponse(association),
    );
  }

  async associateArtistUser(
    dto: AssociateArtistUserDto,
  ): Promise<AdminArtistUserAssociationResponse> {
    const [user, artist, existingUserArtist] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: dto.user_id },
        select: { id: true, role: true },
      }),
      this.prisma.artist.findUnique({
        where: { id: dto.artist_id },
        select: { id: true, user_id: true },
      }),
      this.prisma.artist.findUnique({
        where: { user_id: dto.user_id },
        select: { id: true },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }

    if (artist.user_id) {
      throw new ConflictException('Artist already has an associated user');
    }

    if (existingUserArtist) {
      throw new ConflictException('User already has an associated artist');
    }

    await this.prisma.$transaction([
      this.prisma.artist.update({
        where: { id: dto.artist_id },
        data: { user_id: dto.user_id },
      }),
      ...(user.role === Role.ARTIST
        ? []
        : [
            this.prisma.user.update({
              where: { id: dto.user_id },
              data: { role: Role.ARTIST },
            }),
          ]),
    ]);

    const association = await this.findArtistAssociationOrThrow(dto.artist_id);

    return this.toArtistUserAssociationResponse(association);
  }

  async removeArtistAssociation(
    artistId: number,
  ): Promise<AdminArtistUserRemovalResponse> {
    const association = await this.findArtistAssociationOrThrow(artistId);
    const userId = association.user_id;

    if (!userId) {
      throw new NotFoundException('Artist has no associated user');
    }

    await this.prisma.$transaction([
      this.prisma.artist.update({
        where: { id: artistId },
        data: { user_id: null },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { role: Role.USER },
      }),
    ]);

    return {
      message: 'Association removed',
      artist_id: artistId,
    };
  }

  private buildUserWhere(query: AdminUsersQueryDto): Prisma.UserWhereInput {
    const where: Prisma.UserWhereInput = {};

    if (query.role) {
      where.role = query.role;
    }

    const search = query.q?.trim();
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { display_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  private async findArtistAssociationOrThrow(
    artistId: number,
  ): Promise<AdminArtistUserAssociationRecord> {
    const association = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: adminArtistUserAssociationSelect,
    });

    if (!association) {
      throw new NotFoundException('Artist not found');
    }

    return association;
  }

  private toUserResponse(user: AdminUserRecord): AdminUserResponse {
    return user;
  }

  private toArtistUserAssociationResponse(
    association: AdminArtistUserAssociationRecord,
  ): AdminArtistUserAssociationResponse {
    return {
      artist: {
        id: association.id,
        name: association.name,
        slug: association.slug,
        image_url: association.image_url,
        is_verified: association.is_verified,
        user_id: association.user_id,
      },
      user: association.user,
    };
  }
}
