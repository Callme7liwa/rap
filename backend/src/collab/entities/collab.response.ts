import { CollabStatus, CollabType, Role } from '@prisma/client';

export interface CollabUserResponse {
  id: number;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  role: Role;
}

export interface CollabArtistResponse {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  user_id: number | null;
}

export interface CollabRequestResponse {
  id: number;
  requester_id: number;
  requester: CollabUserResponse;
  artist_id: number;
  artist: CollabArtistResponse;
  collaborator_artist_id: number | null;
  collaborator_artist: CollabArtistResponse | null;
  linked_request_id: number | null;
  collab_type: CollabType;
  message: string;
  status: CollabStatus;
  response_message: string | null;
  created_at: Date;
  updated_at: Date;
  responded_at: Date | null;
}

export interface CollabLimitCheckResponse {
  used: number;
  limit: number;
  remaining: number;
}

export interface CollabSettingsResponse {
  id: number;
  monthly_limit: number;
  updated_at: Date;
  updated_by: number | null;
}
