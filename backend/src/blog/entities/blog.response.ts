import { BlogStatus, Role } from '@prisma/client';

export interface BlogAuthorResponse {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
}

export interface BlogArtistResponse {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  is_verified: boolean;
}

export interface BlogCountsResponse {
  likes: number;
  saves: number;
  comments: number;
}

export interface BlogListItemResponse {
  id: number;
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  status: BlogStatus;
  tags: string[];
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  artist: BlogArtistResponse;
  author: BlogAuthorResponse;
  counts: BlogCountsResponse;
}

export interface BlogDetailResponse extends BlogListItemResponse {
  content: string;
}

export interface BlogInteractionToggleResponse {
  count: number;
}

export interface BlogLikeResponse extends BlogInteractionToggleResponse {
  liked: boolean;
}

export interface BlogSaveResponse extends BlogInteractionToggleResponse {
  saved: boolean;
}

export interface BlogStatusResponse {
  liked: boolean;
  saved: boolean;
}

export interface BlogCommentUserResponse {
  id: number;
  display_name: string | null;
  avatar_url: string | null;
}

export interface BlogCommentResponse {
  id: number;
  post_id: number;
  content: string;
  created_at: Date;
  updated_at: Date;
  user: BlogCommentUserResponse;
}
