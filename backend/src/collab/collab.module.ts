import { Module } from '@nestjs/common';
import { CollabController } from './collab.controller';
import { CollabRequestsService } from './collab-requests.service';
import { CollabSettingsService } from './collab-settings.service';

@Module({
  controllers: [CollabController],
  providers: [CollabRequestsService, CollabSettingsService],
})
export class CollabModule {}
