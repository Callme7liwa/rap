import type { CollabStatus, ExternalProvider, Role } from '@prisma/client';

export interface AdminArtistSummary {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  is_verified: boolean;
}

export interface AdminUserResponse {
  id: number;
  email: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: Date;
  updated_at: Date;
  artist: AdminArtistSummary | null;
}

export interface AdminArtistUserAssociationResponse {
  artist: AdminArtistSummary & {
    user_id: number | null;
  };
  user: {
    id: number;
    email: string;
    display_name: string | null;
    role: Role;
  } | null;
}

export interface AdminArtistUserRemovalResponse {
  message: string;
  artist_id: number;
}

export interface AdminStatsResponse {
  users: {
    total: number;
    by_role: Record<Role, number>;
  };
  artists: {
    total: number;
    verified: number;
  };
  albums: {
    total: number;
  };
  songs: {
    total: number;
  };
  blog: {
    total_posts: number;
    published: number;
  };
  collab_requests: {
    total: number;
    by_status: Record<CollabStatus, number>;
  };
  votes: {
    total_poll_votes: number;
    total_monthly_votes: number;
  };
}

export interface GeniusArtistPreviewResponse {
  provider: 'GENIUS';
  external_id: string;
  name: string;
  slug: string | null;
  url: string;
  image_url: string | null;
  header_image_url: string | null;
  is_verified: boolean;
  followers_count: number | null;
  iq: number | null;
  alternate_names: string[];
  description_markdown: string | null;
  description_preview: string | null;
  instagram: string | null;
  twitter: string | null;
  facebook: string | null;
  has_arabic: boolean;
  likely_moroccan: boolean;
}

export interface GeniusArtistProfileResponse {
  id: number;
  artist_id: number;
  provider: ExternalProvider;
  external_id: string | null;
  url: string;
  slug: string | null;
  last_synced_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface GeniusCatalogImportStats {
  albums_created: number;
  albums_updated: number;
  songs_created: number;
  songs_updated: number;
  songs_skipped: number;
  lyrics_imported: number;
  lyrics_skipped: number;
}

export interface GeniusArtistSyncResponse {
  profile: GeniusArtistProfileResponse;
  preview: GeniusArtistPreviewResponse;
  imported: GeniusCatalogImportStats;
  updated_artist: AdminArtistSummary & {
    header_image_url: string | null;
    bio: string | null;
    instagram: string | null;
    twitter: string | null;
  };
}
