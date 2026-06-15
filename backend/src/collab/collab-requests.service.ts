import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CollabStatus, Prisma, Role } from '@prisma/client';
import type { JwtUser } from '../auth/types/jwt-user.type';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  buildPaginationMeta,
  getPagination,
} from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CollabSettingsService } from './collab-settings.service';
import { CollabQueryDto } from './dto/collab-query.dto';
import { CreateCollabRequestDto } from './dto/create-collab-request.dto';
import { RespondCollabRequestDto } from './dto/respond-collab-request.dto';
import {
  CollabLimitCheckResponse,
  CollabRequestResponse,
} from './entities/collab.response';

const collabUserSelect = {
  id: true,
  email: true,
  display_name: true,
  avatar_url: true,
  role: true,
} satisfies Prisma.UserSelect;

const collabArtistSelect = {
  id: true,
  name: true,
  slug: true,
  image_url: true,
  user_id: true,
} satisfies Prisma.ArtistSelect;

const collabRequestSelect = {
  id: true,
  requester_id: true,
  requester: { select: collabUserSelect },
  artist_id: true,
  artist: { select: collabArtistSelect },
  collaborator_artist_id: true,
  collaborator_artist: { select: collabArtistSelect },
  linked_request_id: true,
  collab_type: true,
  message: true,
  status: true,
  response_message: true,
  created_at: true,
  updated_at: true,
  responded_at: true,
} satisfies Prisma.CollabRequestSelect;

type CollabRequestRecord = Prisma.CollabRequestGetPayload<{
  select: typeof collabRequestSelect;
}>;

type ArtistOwnerRecord = {
  id: number;
  user_id: number | null;
};

@Injectable()
export class CollabRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: CollabSettingsService,
  ) {}

  async create(
    dto: CreateCollabRequestDto,
    currentUser: JwtUser,
  ): Promise<CollabRequestResponse> {
    const [targetArtist, collaboratorArtist] = await Promise.all([
      this.findArtistOwner(dto.artist_id),
      dto.collaborator_artist_id
        ? this.findArtistOwner(dto.collaborator_artist_id)
        : Promise.resolve(null),
    ]);

    if (!targetArtist) {
      throw new NotFoundException('Artist not found');
    }

    if (dto.collaborator_artist_id && !collaboratorArtist) {
      throw new NotFoundException('Collaborator artist not found');
    }

    if (dto.collaborator_artist_id === dto.artist_id) {
      throw new BadRequestException('Collaborator artist must be different');
    }

    await this.assertMonthlyQuotaAvailable(currentUser.id);

    const request = await this.prisma.collabRequest.create({
      data: {
        requester_id: currentUser.id,
        artist_id: dto.artist_id,
        collaborator_artist_id: dto.collaborator_artist_id,
        collab_type: dto.collab_type,
        message: dto.message,
      },
      select: collabRequestSelect,
    });

    return this.toResponse(request);
  }

  async findMyRequests(
    currentUser: JwtUser,
    query: CollabQueryDto,
  ): Promise<PaginatedResponse<CollabRequestResponse>> {
    const pagination = getPagination(query.page, query.limit);
    const where: Prisma.CollabRequestWhereInput = {
      requester_id: currentUser.id,
      status: query.status,
    };

    const [requests, total] = await this.prisma.$transaction([
      this.prisma.collabRequest.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        select: collabRequestSelect,
      }),
      this.prisma.collabRequest.count({ where }),
    ]);

    return {
      data: requests.map((request) => this.toResponse(request)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async findForArtist(
    currentUser: JwtUser,
    query: CollabQueryDto,
  ): Promise<PaginatedResponse<CollabRequestResponse>> {
    const pagination = getPagination(query.page, query.limit);
    const linkedArtist = await this.findArtistLinkedToUser(currentUser.id);
    const where: Prisma.CollabRequestWhereInput = {
      status: query.status,
    };

    if (currentUser.role !== Role.ADMIN) {
      if (!linkedArtist) {
        throw new ForbiddenException('User is not linked to an artist');
      }

      where.OR = [
        { artist_id: linkedArtist.id },
        { collaborator_artist_id: linkedArtist.id },
      ];
    }

    const [requests, total] = await this.prisma.$transaction([
      this.prisma.collabRequest.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { created_at: 'desc' },
        select: collabRequestSelect,
      }),
      this.prisma.collabRequest.count({ where }),
    ]);

    return {
      data: requests.map((request) => this.toResponse(request)),
      meta: buildPaginationMeta(pagination.page, pagination.limit, total),
    };
  }

  async checkLimit(currentUser: JwtUser): Promise<CollabLimitCheckResponse> {
    const [settings, used] = await Promise.all([
      this.settingsService.getSettings(),
      this.countRequestsThisMonth(currentUser.id),
    ]);

    return {
      used,
      limit: settings.monthly_limit,
      remaining: Math.max(0, settings.monthly_limit - used),
    };
  }

  async findOne(
    id: number,
    currentUser: JwtUser,
  ): Promise<CollabRequestResponse> {
    const request = await this.findRequestById(id);
    await this.assertCanView(request, currentUser);

    return this.toResponse(request);
  }

  async respond(
    id: number,
    dto: RespondCollabRequestDto,
    currentUser: JwtUser,
  ): Promise<CollabRequestResponse> {
    const request = await this.findRequestById(id);
    const artistId = await this.resolveRespondingArtistId(request, currentUser);

    if (this.isTerminalStatus(request.status)) {
      throw new BadRequestException('Collab request is no longer actionable');
    }

    const nextData =
      dto.action === 'reject'
        ? this.buildRejectData(request, dto.response_message)
        : this.buildApproveData(request, artistId, dto.response_message);

    const updatedRequest = await this.prisma.collabRequest.update({
      where: { id },
      data: nextData,
      select: collabRequestSelect,
    });

    return this.toResponse(updatedRequest);
  }

  async cancel(
    id: number,
    currentUser: JwtUser,
  ): Promise<CollabRequestResponse> {
    const request = await this.findRequestById(id);

    if (request.requester_id !== currentUser.id) {
      throw new ForbiddenException('Only requester can cancel this request');
    }

    if (
      request.status !== CollabStatus.PENDING &&
      request.status !== CollabStatus.PARTIALLY_APPROVED
    ) {
      throw new BadRequestException('Collab request cannot be cancelled');
    }

    const updatedRequest = await this.prisma.collabRequest.update({
      where: { id },
      data: { status: CollabStatus.CANCELLED },
      select: collabRequestSelect,
    });

    return this.toResponse(updatedRequest);
  }

  private async assertMonthlyQuotaAvailable(userId: number): Promise<void> {
    const [settings, used] = await Promise.all([
      this.settingsService.getSettings(),
      this.countRequestsThisMonth(userId),
    ]);

    if (used >= settings.monthly_limit) {
      throw new ConflictException('Monthly collab request quota reached');
    }
  }

  private countRequestsThisMonth(userId: number): Promise<number> {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return this.prisma.collabRequest.count({
      where: {
        requester_id: userId,
        created_at: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });
  }

  private async findRequestById(id: number): Promise<CollabRequestRecord> {
    const request = await this.prisma.collabRequest.findUnique({
      where: { id },
      select: collabRequestSelect,
    });

    if (!request) {
      throw new NotFoundException('Collab request not found');
    }

    return request;
  }

  private async assertCanView(
    request: CollabRequestRecord,
    currentUser: JwtUser,
  ): Promise<void> {
    if (currentUser.role === Role.ADMIN || request.requester_id === currentUser.id) {
      return;
    }

    const linkedArtist = await this.findArtistLinkedToUser(currentUser.id);

    if (
      linkedArtist &&
      (linkedArtist.id === request.artist_id ||
        linkedArtist.id === request.collaborator_artist_id)
    ) {
      return;
    }

    throw new ForbiddenException('You cannot access this collab request');
  }

  private async resolveRespondingArtistId(
    request: CollabRequestRecord,
    currentUser: JwtUser,
  ): Promise<number> {
    const linkedArtist = await this.findArtistLinkedToUser(currentUser.id);

    if (
      !linkedArtist ||
      (linkedArtist.id !== request.artist_id &&
        linkedArtist.id !== request.collaborator_artist_id)
    ) {
      throw new ForbiddenException('Only involved artists can respond');
    }

    return linkedArtist.id;
  }

  private buildRejectData(
    request: CollabRequestRecord,
    responseMessage: string | undefined,
  ): Prisma.CollabRequestUncheckedUpdateInput {
    return {
      status: CollabStatus.REJECTED,
      response_message: responseMessage,
      responded_at: request.responded_at ?? new Date(),
    };
  }

  private buildApproveData(
    request: CollabRequestRecord,
    artistId: number,
    responseMessage: string | undefined,
  ): Prisma.CollabRequestUncheckedUpdateInput {
    if (!request.collaborator_artist_id) {
      return {
        status: CollabStatus.APPROVED,
        response_message: responseMessage,
        responded_at: request.responded_at ?? new Date(),
      };
    }

    if (request.status === CollabStatus.PENDING) {
      return {
        status: CollabStatus.PARTIALLY_APPROVED,
        linked_request_id: artistId,
        response_message: responseMessage,
      };
    }

    if (request.status === CollabStatus.PARTIALLY_APPROVED) {
      if (request.linked_request_id === artistId) {
        throw new BadRequestException('Artist has already approved this request');
      }

      return {
        status: CollabStatus.APPROVED,
        response_message: responseMessage,
        responded_at: request.responded_at ?? new Date(),
      };
    }

    throw new BadRequestException('Collab request cannot be approved');
  }

  private isTerminalStatus(status: CollabStatus): boolean {
    const terminalStatuses: CollabStatus[] = [
      CollabStatus.APPROVED,
      CollabStatus.REJECTED,
      CollabStatus.CANCELLED,
      CollabStatus.COMPLETED,
    ];

    return terminalStatuses.includes(status);
  }

  private findArtistOwner(artistId: number): Promise<ArtistOwnerRecord | null> {
    return this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true, user_id: true },
    });
  }

  private findArtistLinkedToUser(
    userId: number,
  ): Promise<ArtistOwnerRecord | null> {
    return this.prisma.artist.findUnique({
      where: { user_id: userId },
      select: { id: true, user_id: true },
    });
  }

  private toResponse(request: CollabRequestRecord): CollabRequestResponse {
    return request;
  }
}
