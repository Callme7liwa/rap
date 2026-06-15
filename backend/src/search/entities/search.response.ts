export interface ArtistSearchResult {
  id: number;
  name: string;
  slug: string;
  image_url: string | null;
  is_verified: boolean;
}

export interface AlbumSearchArtistResult {
  id: number;
  name: string;
  slug: string;
}

export interface AlbumSearchResult {
  id: number;
  name: string;
  slug: string;
  cover_art_url: string | null;
  release_date: string | null;
  artist: AlbumSearchArtistResult;
}

export interface SongSearchArtistResult {
  id: number;
  name: string;
  slug: string;
}

export interface SongSearchAlbumResult {
  id: number;
  name: string;
}

export interface SongSearchResult {
  id: number;
  title: string;
  slug: string;
  song_art_image_url: string | null;
  release_date: string | null;
  primary_artist: SongSearchArtistResult;
  album: SongSearchAlbumResult | null;
}

export interface SearchMeta {
  query: string;
  total: number;
}

export interface SearchResponse {
  artists: ArtistSearchResult[];
  albums: AlbumSearchResult[];
  songs: SongSearchResult[];
  meta: SearchMeta;
}
