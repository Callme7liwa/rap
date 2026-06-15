export interface SongArtistResponse {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  is_verified: boolean;
}

export interface SongAlbumResponse {
  id: number;
  name: string;
  slug: string;
  cover_art_url: string | null;
  release_date: string | null;
}

export interface SongListItemResponse {
  id: number;
  title: string;
  slug: string;
  lyrics: string | null;
  song_art_image_url: string | null;
  release_date: string | null;
  primary_artist_id: number;
  album_id: number | null;
  created_at: Date;
  updated_at: Date;
  primary_artist: SongArtistResponse;
  album: SongAlbumResponse | null;
}

export type SongDetailResponse = SongListItemResponse;
