import seedData from '@/data/seed.json';

export interface Artist {
  id: number;
  name: string;
  slug: string;
  url: string;
  image_url: string;
  header_image_url: string;
  is_verified: boolean;
  followers_count: number;
  alternate_names: string[];
  instagram_name?: string;
  twitter_name?: string;
  facebook_name?: string;
  normalized_name: string;
  has_arabic: boolean;
  likely_moroccan: boolean;
  source_names: string[];
  songs_count: number;
}

export interface Album {
  id: number;
  name: string;
  full_title: string;
  url: string;
  cover_art_url: string;
  release_date_for_display: string;
  release_date_components: { year: number; month: number; day: number };
  artist_id: number;
  artist_name: string;
  songs: Array<{ id: number; title: string; url?: string }>;
}

export interface Song {
  id: number;
  title: string;
  full_title: string;
  url: string;
  release_date_for_display: string;
  release_date_components: { year: number; month: number; day: number };
  song_art_image_url: string;
  lyrics_state: string;
  instrumental: boolean;
  annotation_count: number;
  pyongs_count: number;
  pageviews: number;
  primary_artist_id: number;
  primary_artist_name: string;
  album_id: number | null;
  lyrics: string;
  path?: string;
  primary_artist_slug?: string;
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Simulated API delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function getArtists(options: {
  query?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Artist[]; total: number; page: number; limit: number }> {
  await delay(300);
  
  const { query = '', page = 1, limit = 20 } = options;
  const cacheKey = `artists:${query}:${page}:${limit}`;
  
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  let filtered = [...seedData.artists];
  
  if (query) {
    const searchTerm = query.toLowerCase();
    filtered = filtered.filter(artist =>
      artist.name.toLowerCase().includes(searchTerm) ||
      artist.alternate_names.some(name => name.toLowerCase().includes(searchTerm))
    );
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  const result = { data, total, page, limit };
  setCache(cacheKey, result);
  
  return result;
}

export async function getArtistById(id: number): Promise<Artist | null> {
  await delay(200);
  
  const cacheKey = `artist:${id}`;
  const cached = getCached<Artist | null>(cacheKey);
  if (cached !== null) return cached;

  const artist = seedData.artists.find(a => a.id === id) || null;
  setCache(cacheKey, artist);
  
  return artist;
}

export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  await delay(200);
  
  const cacheKey = `artist:slug:${slug}`;
  const cached = getCached<Artist | null>(cacheKey);
  if (cached !== null) return cached;

  const artist = seedData.artists.find(a => a.slug === slug) || null;
  setCache(cacheKey, artist);
  
  return artist;
}

export async function getArtistSongs(artistId: number): Promise<Song[]> {
  await delay(200);
  
  const cacheKey = `artist:${artistId}:songs`;
  const cached = getCached<Song[]>(cacheKey);
  if (cached) return cached;

  const songs = seedData.songs.filter(s => s.primary_artist_id === artistId);
  setCache(cacheKey, songs);
  
  return songs;
}

export async function getArtistAlbums(artistId: number): Promise<Album[]> {
  await delay(200);
  
  const cacheKey = `artist:${artistId}:albums`;
  const cached = getCached<Album[]>(cacheKey);
  if (cached) return cached;

  const albums = seedData.albums.filter(a => a.artist_id === artistId);
  setCache(cacheKey, albums);
  
  return albums;
}

export async function getAlbums(options: {
  artistId?: number;
  year?: number;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Album[]; total: number; page: number; limit: number }> {
  await delay(300);
  
  const { artistId, year, page = 1, limit = 20 } = options;
  const cacheKey = `albums:${artistId}:${year}:${page}:${limit}`;
  
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  let filtered = [...seedData.albums];
  
  if (artistId) {
    filtered = filtered.filter(album => album.artist_id === artistId);
  }
  
  if (year) {
    filtered = filtered.filter(album => album.release_date_components.year === year);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  const result = { data, total, page, limit };
  setCache(cacheKey, result);
  
  return result;
}

export async function getAlbumById(id: number): Promise<Album | null> {
  await delay(200);
  
  const cacheKey = `album:${id}`;
  const cached = getCached<Album | null>(cacheKey);
  if (cached !== null) return cached;

  const album = seedData.albums.find(a => a.id === id) || null;
  setCache(cacheKey, album);
  
  return album;
}

export async function getSongs(options: {
  query?: string;
  artistId?: number;
  albumId?: number;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Song[]; total: number; page: number; limit: number }> {
  await delay(300);
  
  const { query = '', artistId, albumId, page = 1, limit = 20 } = options;
  const cacheKey = `songs:${query}:${artistId}:${albumId}:${page}:${limit}`;
  
  const cached = getCached<any>(cacheKey);
  if (cached) return cached;

  let filtered = [...seedData.songs];
  
  if (query) {
    const searchTerm = query.toLowerCase();
    filtered = filtered.filter(song =>
      song.title.toLowerCase().includes(searchTerm) ||
      song.primary_artist_name.toLowerCase().includes(searchTerm)
    );
  }
  
  if (artistId) {
    filtered = filtered.filter(song => song.primary_artist_id === artistId);
  }
  
  if (albumId) {
    filtered = filtered.filter(song => song.album_id === albumId);
  }

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  const result = { data, total, page, limit };
  setCache(cacheKey, result);
  
  return result;
}

export async function getSongById(id: number): Promise<Song | null> {
  await delay(200);
  
  const cacheKey = `song:${id}`;
  const cached = getCached<Song | null>(cacheKey);
  if (cached !== null) return cached;

  const song = seedData.songs.find(s => s.id === id) || null;
  setCache(cacheKey, song);
  
  return song;
}

export async function search(query: string): Promise<{
  artists: Artist[];
  albums: Album[];
  songs: Song[];
}> {
  await delay(400);
  
  const searchTerm = query.toLowerCase();
  
  const artists = seedData.artists.filter(artist =>
    artist.name.toLowerCase().includes(searchTerm) ||
    artist.alternate_names.some(name => name.toLowerCase().includes(searchTerm))
  );
  
  const albums = seedData.albums.filter(album =>
    album.name.toLowerCase().includes(searchTerm) ||
    album.artist_name.toLowerCase().includes(searchTerm)
  );
  
  const songs = seedData.songs.filter(song =>
    song.title.toLowerCase().includes(searchTerm) ||
    song.primary_artist_name.toLowerCase().includes(searchTerm)
  );
  
  return { artists, albums, songs };
}
