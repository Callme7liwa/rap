import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AdminModule } from './admin/admin.module';
import { ArtistsModule } from './artists/artists.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { AlbumsModule } from './albums/albums.module';
import { CollabModule } from './collab/collab.module';
import { PrismaModule } from './prisma/prisma.module';
import { BlogModule } from './blog/blog.module';
import { SearchModule } from './search/search.module';
import { SocialModule } from './social/social.module';
import { SongsModule } from './songs/songs.module';
import { UsersModule } from './users/users.module';
import { VotingModule } from './voting/voting.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ArtistsModule,
    AlbumsModule,
    SongsModule,
    SearchModule,
    SocialModule,
    BlogModule,
    VotingModule,
    CollabModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
