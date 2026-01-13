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
  description_preview?: string | null;
  description_html?: string | null;
  description_markdown?: string | null;
  iq?: number;
  vote_count?: number;
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
  vote_count?: number;
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
  vote_count?: number;
}

export interface VoteStats {
  item_id: number;
  item_type: 'song' | 'album' | 'artist';
  total_votes: number;
  nominations: number;
  won_polls: number;
  stats: Array<{
    poll_id: string;
    category: string;
    votes: number;
    percentage: number;
    name: string;
  }>;
}

export interface Poll {
  poll_id: string;
  category: 'song' | 'album' | 'artist';
  period: string;
  start_date: number;
  end_date: number;
  is_active: boolean;
  total_votes: number;
  nominees: Array<{
    PK: string;
    SK: string;
    item_id: number;
    item_type: string;
    name: string;
    image: string | null;
    artist_name: string | null;
    album_name: string | null;
    votes: number;
    percentage: number;
  }>;
}

export interface UserVote {
  vote_id: string;
  poll_id: string;
  nominee_id: number;
  nominee_name: string;
  category: string;
  voted_at: number;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown) {
  cache.set(key, { data, timestamp: Date.now() });
}

const API_BASE = (import.meta as any)?.env?.VITE_API_BASE || '';

// Helper to get auth token from Amplify
async function getAuthToken(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() || null;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

// Helper pour gérer les erreurs d'API
async function fetchAPI<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    // Get auth token if available
    const token = await getAuthToken();
    
    // Merge headers with auth token
    const headers = {
      ...options?.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

export async function getArtists(options: {
  query?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Artist[]; total: number; page: number; limit: number }> {
  const { query = '', page = 1, limit = 20 } = options;
  const cacheKey = `artists:${query}:${page}:${limit}`;

  const cached = getCached<{ data: Artist[]; total: number; page: number; limit: number }>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  if (query) params.set('query', query);

  const result = await fetchAPI<{ data: Artist[]; total: number; page: number; limit: number }>(`/api/artists?${params.toString()}`);
  setCache(cacheKey, result);

  return result;
}

export async function getArtistById(id: number): Promise<Artist | null> {
  const cacheKey = `artist:${id}`;
  const cached = getCached<Artist | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    const artist = await fetchAPI<Artist>(`/api/artists/${id}`);
    setCache(cacheKey, artist);
    return artist;
  } catch (error) {
    setCache(cacheKey, null);
    return null;
  }
}

export async function getArtistBySlug(slug: string): Promise<Artist | null> {
  const cacheKey = `artist:slug:${slug}`;
  const cached = getCached<Artist | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    const artist = await fetchAPI<Artist>(`/api/artists/slug/${slug}`);
    setCache(cacheKey, artist);
    return artist;
  } catch (error) {
    setCache(cacheKey, null);
    return null;
  }
}

export async function getArtistSongs(artistId: number): Promise<Song[]> {
  const cacheKey = `artist:${artistId}:songs`;
  const cached = getCached<Song[]>(cacheKey);
  if (cached) return cached;

  const result = await fetchAPI<{ data: Song[] }>(`/api/artists/${artistId}/songs`);
  const songs = result.data || [];
  setCache(cacheKey, songs);
  return songs;
}

export async function getArtistAlbums(artistId: number): Promise<Album[]> {
  const cacheKey = `artist:${artistId}:albums`;
  const cached = getCached<Album[]>(cacheKey);
  if (cached) return cached;

  const albums = await fetchAPI<Album[]>(`/api/artists/${artistId}/albums`);
  setCache(cacheKey, albums);
  return albums;
}

export async function getAlbums(options: {
  artistId?: number;
  year?: number;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Album[]; total: number; page: number; limit: number }> {
  const { artistId, year, page = 1, limit = 20 } = options;
  const cacheKey = `albums:${artistId}:${year}:${page}:${limit}`;

  const cached = getCached<{ data: Album[]; total: number; page: number; limit: number }>(cacheKey);
  if (cached) return cached;

  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit)
  });

  if (artistId) params.set('artistId', String(artistId));
  if (year) params.set('year', String(year));

  const result = await fetchAPI<{ data: Album[]; total: number; page: number; limit: number }>(`/api/albums?${params.toString()}`);
  setCache(cacheKey, result);

  return result;
}

export async function getAlbumById(id: number): Promise<Album | null> {
  const cacheKey = `album:${id}`;
  const cached = getCached<Album | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    const album = await fetchAPI<Album>(`/api/albums/${id}`);
    setCache(cacheKey, album);
    return album;
  } catch (error) {
    setCache(cacheKey, null);
    return null;
  }
}

export async function getSongs(options: {
  query?: string;
  artistId?: number;
  albumId?: number;
  page?: number;
  limit?: number;
  cursor?: string;
} = {}): Promise<{ data: Song[]; total: number; page: number; limit: number; nextCursor?: string; hasMore?: boolean }> {
  const { query = '', artistId, albumId, page = 1, limit = 20, cursor } = options;
  const cacheKey = `songs:${query}:${artistId}:${albumId}:${page}:${limit}:${cursor || ''}`;

  const params = new URLSearchParams({
    limit: String(limit)
  });

  if (query) params.set('q', query);
  if (artistId) params.set('artistId', String(artistId));
  if (albumId) params.set('albumId', String(albumId));
  if (cursor) params.set('cursor', cursor);

  const result = await fetchAPI<{ data: Song[]; total?: number; nextCursor?: string; hasMore?: boolean }>(`/api/songs?${params.toString()}`);
  let data = result.data || [];

  // Filtrer par albumId côté client si le backend ne le fait pas
  if (albumId) {
    data = data.filter(s => s.album_id === albumId);
  }

  const response = {
    data,
    total: result.total || data.length,
    page,
    limit,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore
  };

  setCache(cacheKey, response);
  return response;
}

export async function getSongById(id: number): Promise<Song | null> {
  const cacheKey = `song:${id}`;
  const cached = getCached<Song | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await fetchAPI<{ song: Song }>(`/api/songs/${id}`);
    const song = result.song || null;
    setCache(cacheKey, song);
    return song;
  } catch (error) {
    console.error('Error fetching song:', error);
    setCache(cacheKey, null);
    return null;
  }
}

export async function search(query: string): Promise<{
  artists: Artist[];
  albums: Album[];
  songs: Song[];
}> {
  if (!query || query.trim() === '') {
    return { artists: [], albums: [], songs: [] };
  }

  try {
    const params = new URLSearchParams({ q: query });
    return await fetchAPI<{ artists: Artist[]; albums: Album[]; songs: Song[] }>(`/api/search?${params.toString()}`);
  } catch (error) {
    console.error('Error performing search:', error);
    return { artists: [], albums: [], songs: [] };
  }
}

// ============================================
// Voting API
// ============================================

export async function getActivePolls(category?: 'song' | 'album' | 'artist'): Promise<{ polls: Poll[] }> {
  try {
    const params = category ? new URLSearchParams({ category }) : '';
    return await fetchAPI<{ polls: Poll[] }>(`/api/voting/polls${params ? '?' + params : ''}`);
  } catch (error) {
    console.error('Error fetching polls:', error);
    return { polls: [] };
  }
}

export async function getPoll(pollId: string): Promise<{ poll: Poll | null }> {
  try {
    return await fetchAPI<{ poll: Poll }>(`/api/voting/polls/${pollId}`);
  } catch (error) {
    console.error('Error fetching poll:', error);
    return { poll: null };
  }
}

export async function castVote(pollId: string, nomineeId: number): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    return await fetchAPI<{ success: boolean; message: string }>(`/api/voting/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poll_id: pollId, nominee_id: nomineeId }),
    });
  } catch (error: any) {
    console.error('Error casting vote:', error);
    return { success: false, message: '', error: error.message || 'Failed to cast vote' };
  }
}

export async function getUserVotes(): Promise<{ votes: UserVote[] }> {
  try {
    return await fetchAPI<{ votes: UserVote[] }>(`/api/voting/user/votes`);
  } catch (error) {
    console.error('Error fetching user votes:', error);
    return { votes: [] };
  }
}

export async function getItemVoteStats(type: 'song' | 'album' | 'artist', id: number): Promise<VoteStats | null> {
  try {
    return await fetchAPI<VoteStats>(`/api/voting/item/${type}/${id}/stats`);
  } catch (error) {
    console.error('Error fetching item vote stats:', error);
    return null;
  }
}

// ============================================
// Direct Item Voting (one vote per category)
// ============================================

export async function voteForItem(type: 'song' | 'album' | 'artist', id: number): Promise<{ success: boolean; message: string; action: 'added' | 'updated' | 'removed'; error?: string; max_votes_reached?: boolean }> {
  try {
    return await fetchAPI<{ success: boolean; message: string; action: 'added' | 'updated' | 'removed'; max_votes_reached?: boolean }>(`/api/voting/item/${type}/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: Error | unknown) {
    console.error('Error voting for item:', error);
    return { success: false, message: '', action: 'added', error: (error as Error).message || 'Failed to vote' };
  }
}

export async function getUserItemVotes(): Promise<{ votes: { song?: number[]; album?: number[]; artist?: number[] } }> {
  try {
    return await fetchAPI<{ votes: { song?: number[]; album?: number[]; artist?: number[] } }>(`/api/voting/user/item-votes`);
  } catch (error) {
    console.error('Error fetching user item votes:', error);
    return { votes: {} };
  }
}

export async function getItemVoteCount(type: 'song' | 'album' | 'artist', id: number): Promise<{ item_id: number; item_type: string; vote_count: number }> {
  try {
    return await fetchAPI<{ item_id: number; item_type: string; vote_count: number }>(`/api/voting/item/${type}/${id}/count`);
  } catch (error) {
    console.error('Error fetching item vote count:', error);
    return { item_id: id, item_type: type, vote_count: 0 };
  }
}

export async function getTopVotedItems(category?: 'song' | 'album' | 'artist' | 'all', limit: number = 5): Promise<{
  top: {
    song?: Array<{ id: number; title: string; primary_artist_name: string; song_art_image_url: string; vote_count: number }>;
    album?: Array<{ id: number; name: string; artist_name: string; cover_art_url: string; vote_count: number }>;
    artist?: Array<{ id: number; name: string; image_url: string; vote_count: number }>;
  }
}> {
  try {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    params.set('limit', String(limit));
    
    return await fetchAPI<{
      top: {
        song?: Array<{ id: number; title: string; primary_artist_name: string; song_art_image_url: string; vote_count: number }>;
        album?: Array<{ id: number; name: string; artist_name: string; cover_art_url: string; vote_count: number }>;
        artist?: Array<{ id: number; name: string; image_url: string; vote_count: number }>;
      }
    }>(`/api/voting/top?${params.toString()}`);
  } catch (error) {
    console.error('Error fetching top voted items:', error);
    return { top: {} };
  }
}

// ============================================
// Admin API
// ============================================

export async function getArtistUserAssociations(): Promise<{ associations: Array<any> }> {
  try {
    return await fetchAPI<{ associations: Array<any> }>('/api/admin/artist-users');
  } catch (error) {
    console.error('Error fetching associations:', error);
    return { associations: [] };
  }
}

export async function associateArtistWithUser(artistId: number, userEmail: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    return await fetchAPI<{ success: boolean; message: string }>('/api/admin/artist-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ artist_id: artistId, user_email: userEmail }),
    });
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create association' };
  }
}

export async function removeArtistAssociation(artistId: number): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    return await fetchAPI<{ success: boolean; message: string }>(`/api/admin/artist-users/${artistId}`, {
      method: 'DELETE',
    });
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to remove association' };
  }
}

export async function searchCognitoUsers(email: string): Promise<{ users: Array<any> }> {
  try {
    const params = new URLSearchParams({ email });
    return await fetchAPI<{ users: Array<any> }>(`/api/admin/search-users?${params.toString()}`);
  } catch (error) {
    console.error('Error searching users:', error);
    return { users: [] };
  }
}

export async function getAllCognitoUsers(limit = 60): Promise<{ users: Array<any> }> {
  try {
    const params = new URLSearchParams({ limit: limit.toString() });
    console.log('[getAllCognitoUsers] Fetching users from:', `/api/admin/users?${params.toString()}`);
    const result = await fetchAPI<{ users: Array<any> }>(`/api/admin/users?${params.toString()}`);
    console.log('[getAllCognitoUsers] Received users:', result.users?.length || 0);
    return result;
  } catch (error) {
    console.error('[getAllCognitoUsers] Error fetching users:', error);
    return { users: [] };
  }
}

export async function getAdminStats(): Promise<{ total_artists: number; associated_artists: number; unassociated_artists: number }> {
  try {
    return await fetchAPI<{ total_artists: number; associated_artists: number; unassociated_artists: number }>('/api/admin/stats');
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return { total_artists: 0, associated_artists: 0, unassociated_artists: 0 };
  }
}

// ============================================
// Artist Profile API
// ============================================

export async function getMyArtistProfile(): Promise<{ artist: Artist; association: any } | null> {
  try {
    return await fetchAPI<{ artist: Artist; association: any }>('/api/artist-profile/me');
  } catch (error) {
    console.error('Error fetching artist profile:', error);
    return null;
  }
}

export async function updateMyArtistProfile(data: {
  description_preview?: string;
  description_html?: string;
  description_markdown?: string;
  instagram_name?: string;
  twitter_name?: string;
  facebook_name?: string;
}): Promise<{ success: boolean; artist?: Artist; error?: string }> {
  try {
    return await fetchAPI<{ success: boolean; artist: Artist }>('/api/artist-profile/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update profile' };
  }
}

// ============================================
// Social Features API
// ============================================

// Follow/Unfollow Artist
export async function followArtist(artistId: number): Promise<{ success: boolean; action: string; following: boolean }> {
  return await fetchAPI(`/api/social/follow/artist/${artistId}`, {
    method: 'POST'
  });
}

export async function checkFollowingArtist(artistId: number): Promise<{ following: boolean }> {
  return await fetchAPI(`/api/social/follow/artist/${artistId}/check`);
}

export async function getArtistFollowerCount(artistId: number): Promise<{ count: number }> {
  return await fetchAPI(`/api/social/follow/artist/${artistId}/count`);
}

export async function getMyFollowedArtists(): Promise<{ artists: Array<any> }> {
  return await fetchAPI('/api/social/follow/my-artists');
}

// Like/Unlike Content
export async function likeContent(type: 'song' | 'album', id: number): Promise<{ success: boolean; action: string; liked: boolean }> {
  return await fetchAPI(`/api/social/like/${type}/${id}`, {
    method: 'POST'
  });
}

export async function checkLikedContent(type: 'song' | 'album', id: number): Promise<{ liked: boolean }> {
  return await fetchAPI(`/api/social/like/${type}/${id}/check`);
}

export async function getContentLikeCount(type: 'song' | 'album', id: number): Promise<{ count: number }> {
  return await fetchAPI(`/api/social/like/${type}/${id}/count`);
}

export async function getMyLikedContent(type?: 'song' | 'album'): Promise<{ songs: Array<any>; albums: Array<any> }> {
  const query = type ? `?type=${type}` : '';
  return await fetchAPI(`/api/social/like/my-content${query}`);
}

// Comments
export async function addComment(type: 'song' | 'album', id: number, text: string): Promise<{ success: boolean; comment: any }> {
  return await fetchAPI(`/api/social/comment/${type}/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}

export async function getComments(type: 'song' | 'album', id: number, limit = 50, lastKey?: string): Promise<{ comments: Array<any>; lastKey: string | null; count: number }> {
  const query = lastKey ? `?limit=${limit}&lastKey=${lastKey}` : `?limit=${limit}`;
  return await fetchAPI(`/api/social/comment/${type}/${id}${query}`);
}

export async function deleteComment(type: 'song' | 'album', id: number, commentId: string): Promise<{ success: boolean; message: string }> {
  return await fetchAPI(`/api/social/comment/${type}/${id}/${commentId}`, {
    method: 'DELETE'
  });
}

export async function getMyComments(): Promise<{ comments: Array<any> }> {
  return await fetchAPI('/api/social/comment/my-comments');
}

