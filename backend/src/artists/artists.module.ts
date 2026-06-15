import { Module } from '@nestjs/common';
import { ArtistsController } from './artists.controller';
import { ArtistsRepository } from './artists.repository';
import { ArtistsService } from './artists.service';

@Module({
  controllers: [ArtistsController],
  providers: [ArtistsService, ArtistsRepository],
})
export class ArtistsModule {}
