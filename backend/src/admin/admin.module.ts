import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGeniusService } from './admin-genius.service';
import { AdminStatsService } from './admin-stats.service';
import { AdminUsersService } from './admin-users.service';

@Module({
  controllers: [AdminController],
  providers: [AdminUsersService, AdminStatsService, AdminGeniusService],
})
export class AdminModule {}
