import { ItemType } from '@prisma/client';

export interface FollowStatusResponse {
  following: boolean;
}

export interface LikeStatusResponse {
  liked: boolean;
}

export interface CountResponse {
  count: number;
}

export interface FollowedArtistResponse {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  is_verified: boolean;
  followed_at: Date;
}

export interface SocialArtistSummary {
  id: number;
  name: string;
  slug: string;
}

export interface LikedAlbumItem {
  id: number;
  name: string;
  slug: string;
  cover_art_url: string | null;
  release_date: string | null;
  artist: SocialArtistSummary;
}

export interface LikedSongItem {
  id: number;
  title: string;
  slug: string;
  song_art_image_url: string | null;
  release_date: string | null;
  primary_artist: SocialArtistSummary;
}

export type LikedContentItem = LikedAlbumItem | LikedSongItem;

export interface LikedContentResponse {
  like_id: number;
  item_type: ItemType;
  item_id: number;
  created_at: Date;
  item: LikedContentItem | null;
}

export interface CommentUserResponse {
  id: number;
  display_name: string | null;
  avatar_url: string | null;
}

export interface CommentResponse {
  id: number;
  item_type: ItemType;
  item_id: number;
  content: string;
  created_at: Date;
  updated_at: Date;
  user: CommentUserResponse;
}
