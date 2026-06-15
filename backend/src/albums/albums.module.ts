import { Module } from '@nestjs/common';
import { AlbumsController } from './albums.controller';
import { AlbumsRepository } from './albums.repository';
import { AlbumsService } from './albums.service';

@Module({
  controllers: [AlbumsController],
  providers: [AlbumsService, AlbumsRepository],
})
export class AlbumsModule {}
