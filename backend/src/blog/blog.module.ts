import { Module } from '@nestjs/common';
import { BlogController } from './blog.controller';
import { BlogInteractionsService } from './blog-interactions.service';
import { BlogPostsService } from './blog-posts.service';

@Module({
  controllers: [BlogController],
  providers: [BlogPostsService, BlogInteractionsService],
})
export class BlogModule {}
