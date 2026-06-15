import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { FollowService } from './follow.service';
import { LikeService } from './like.service';
import { SocialController } from './social.controller';

@Module({
  controllers: [SocialController],
  providers: [FollowService, LikeService, CommentService],
})
export class SocialModule {}
