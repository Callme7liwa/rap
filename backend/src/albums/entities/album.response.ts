export interface AlbumArtistResponse {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  is_verified: boolean;
}

export interface AlbumSongResponse {
  id: number;
  title: string;
  slug: string;
  song_art_image_url: string | null;
  release_date: string | null;
}

export interface AlbumListItemResponse {
  id: number;
  name: string;
  slug: string;
  cover_art_url: string | null;
  release_date: string | null;
  artist_id: number;
  created_at: Date;
  updated_at: Date;
  artist: AlbumArtistResponse;
}

export interface AlbumDetailResponse extends AlbumListItemResponse {
  songs: AlbumSongResponse[];
}
