import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCollabSettingsDto } from './dto/update-collab-settings.dto';
import { CollabSettingsResponse } from './entities/collab.response';

const COLLAB_SETTINGS_ID = 1;
const DEFAULT_MONTHLY_LIMIT = 3;

@Injectable()
export class CollabSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  getSettings(): Promise<CollabSettingsResponse> {
    return this.prisma.collabSettings.upsert({
      where: { id: COLLAB_SETTINGS_ID },
      create: {
        id: COLLAB_SETTINGS_ID,
        monthly_limit: DEFAULT_MONTHLY_LIMIT,
      },
      update: {},
    });
  }

  updateSettings(
    dto: UpdateCollabSettingsDto,
    updatedBy: number,
  ): Promise<CollabSettingsResponse> {
    return this.prisma.collabSettings.upsert({
      where: { id: COLLAB_SETTINGS_ID },
      create: {
        id: COLLAB_SETTINGS_ID,
        monthly_limit: dto.monthly_limit,
        updated_by: updatedBy,
      },
      update: {
        monthly_limit: dto.monthly_limit,
        updated_by: updatedBy,
      },
    });
  }
}
