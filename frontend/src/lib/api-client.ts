import {
  clearStoredAuth,
  getStoredAuthToken,
  getStoredAuthUser,
} from '@/store/auth.store';

export type Role = 'USER' | 'ARTIST' | 'ADMIN';
export type ItemType = 'song' | 'album';
export type VotableType = 'artist' | 'album' | 'song';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

interface ApiPaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

export interface PaginatedResponse<TItem> {
  data: TItem[];
  meta: PaginationMeta;
}

interface ApiPaginatedResponse<TItem> {
  data: TItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface Artist {
  id: number;
  name: string;
  slug: string;
  url?: string;
  image_url: string | null;
  header_image_url?: string | null;
  bio?: string | null;
  alternate_names?: string[];
  description_preview?: string | null;
  instagram_name?: string | null;
  twitter_name?: string | null;
  facebook_name?: string | null;
  is_verified: boolean;
  followers_count?: number;
  songs_count?: number;
  user_id?: number | null;
}

export interface Album {
  id: number;
  name: string;
  slug: string;
  full_title?: string;
  url?: string;
  cover_art_url: string | null;
  release_date: string | null;
  release_date_for_display?: string;
  artist_id?: number;
  artist_name?: string;
  artist?: Pick<Artist, 'id' | 'name' | 'slug'>;
  songs?: Array<{ id: number; title: string; slug?: string }>;
  vote_count?: number;
}

export interface Song {
  id: number;
  title: string;
  slug: string;
  full_title?: string;
  url?: string;
  lyrics?: string | null;
  song_art_image_url: string | null;
  release_date: string | null;
  release_date_for_display?: string;
  primary_artist_id?: number;
  primary_artist_name?: string;
  primary_artist?: Pick<Artist, 'id' | 'name' | 'slug'>;
  album_id: number | null;
  album?: Pick<Album, 'id' | 'name' | 'slug'> | null;
  vote_count?: number;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  status: 'DRAFT' | 'PUBLISHED';
  artistId: number;
  authorId: string | number;
  authorName: string;
  authorImage: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  isPublished: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface BlogComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userImage: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface CreateBlogPostInput {
  title: string;
  excerpt?: string;
  content: string;
  cover_image?: string;
  tags?: string[];
  status: 'DRAFT' | 'PUBLISHED';
  artist_id: number;
}

export interface UpdateBlogPostInput {
  title?: string;
  excerpt?: string;
  content?: string;
  cover_image?: string;
  tags?: string[];
  status?: 'DRAFT' | 'PUBLISHED';
}

export interface BlogStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

export interface Poll {
  id: number;
  title: string;
  category: 'ARTIST' | 'ALBUM' | 'SONG';
  period: 'MONTHLY' | 'YEARLY';
  status: 'ACTIVE' | 'CLOSED';
  starts_at: string;
  ends_at: string;
  nominees: Array<{
    id: number;
    item_id: number;
    item_name: string;
    item_image: string;
    votes_count: number;
    percentage: number;
  }>;
  total_votes: number;
  created_at: string;
}

export interface UserVote {
  id: number;
  poll_id: number;
  nominee_id: number;
  user_id: number;
  created_at: string;
  poll?: {
    id: number;
    title: string;
    category: 'ARTIST' | 'ALBUM' | 'SONG';
    period: 'MONTHLY' | 'YEARLY';
    status: 'ACTIVE' | 'CLOSED';
  };
  nominee?: {
    id: number;
    item_id?: number;
    item_name: string;
  };
}

export interface MonthlyVote {
  id: number;
  user_id: number;
  item_type: 'ARTIST' | 'ALBUM' | 'SONG';
  item_id: number;
  period: string;
  created_at: string;
}

export interface AdminUser {
  id: number;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: string;
  artist?: Artist | null;
}

export interface ArtistUserAssociation {
  artist: Artist & { user_id: number | null };
  user: Pick<AdminUser, 'id' | 'email' | 'display_name' | 'role'> | null;
}

export type CollabStatus =
  | 'PENDING'
  | 'PARTIALLY_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface AdminStats {
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

export interface GeniusArtistPreview {
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

export interface GeniusArtistProfile {
  id: number;
  artist_id: number;
  provider: 'GENIUS';
  external_id: string | null;
  url: string;
  slug: string | null;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
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
  profile: GeniusArtistProfile;
  preview: GeniusArtistPreview;
  imported: GeniusCatalogImportStats;
  updated_artist: Artist & {
    header_image_url: string | null;
    bio: string | null;
    instagram: string | null;
    twitter: string | null;
  };
}

type QueryValue = string | number | boolean | null | undefined;

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function buildQuery(params: Record<string, QueryValue>) {
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  }

  return query.toString();
}

function normalizePaginationMeta(meta: ApiPaginationMeta): PaginationMeta {
  return {
    ...meta,
    hasPreviousPage: meta.page > 1,
    hasNextPage: meta.page < meta.total_pages,
  };
}

function endpoint(path: string) {
  const normalizedPath = path.startsWith('/api') ? path : `/api${path}`;
  return `${API_URL}${normalizedPath}`;
}

async function parseError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as
    | { message?: string | string[]; error?: string }
    | null;
  const message = body?.message;

  if (Array.isArray(message)) {
    return message.join(', ');
  }

  return message || body?.error || `API error ${response.status}`;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiRequest<TResponse>(
  path: string,
  options: RequestInit = {},
): Promise<TResponse> {
  const token = getStoredAuthToken();
  const headers = new Headers(options.headers);

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint(path), {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearStoredAuth();
    window.location.assign('/login');
    throw new Error('Session expired');
  }

  if (!response.ok) {
    throw new ApiRequestError(await parseError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as TResponse;
  }

  return (await response.json()) as TResponse;
}

function normalizeArtist(artist: Artist): Artist {
  return {
    ...artist,
    url: artist.url ?? `/artists/${artist.id}`,
    image_url: artist.image_url ?? '/placeholder.svg',
    header_image_url: artist.header_image_url ?? null,
    bio: artist.bio ?? null,
    alternate_names: artist.alternate_names ?? [],
    description_preview: artist.description_preview ?? artist.bio ?? null,
    followers_count: artist.followers_count ?? 0,
    songs_count: artist.songs_count ?? 0,
  };
}

function normalizeAlbum(album: Album): Album {
  return {
    ...album,
    full_title: album.full_title ?? album.name,
    url: album.url ?? `/albums/${album.id}`,
    cover_art_url: album.cover_art_url ?? '/placeholder.svg',
    release_date_for_display: album.release_date_for_display ?? album.release_date ?? '',
    artist_id: album.artist_id ?? album.artist?.id,
    artist_name: album.artist_name ?? album.artist?.name,
    songs: album.songs ?? [],
  };
}

function normalizeSong(song: Song): Song {
  return {
    ...song,
    full_title: song.full_title ?? song.title,
    url: song.url ?? `/songs/${song.id}`,
    song_art_image_url: song.song_art_image_url ?? '/placeholder.svg',
    release_date_for_display: song.release_date_for_display ?? song.release_date ?? '',
    primary_artist_id: song.primary_artist_id ?? song.primary_artist?.id,
    primary_artist_name: song.primary_artist_name ?? song.primary_artist?.name,
    lyrics: song.lyrics ?? '',
  };
}

export async function getArtists(options: {
  query?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Artist[]; total: number; page: number; limit: number }> {
  const artists = await apiRequest<Artist[]>('/artists');
  const filtered = options.query
    ? artists.filter((artist) =>
        artist.name.toLowerCase().includes(options.query?.toLowerCase() ?? ''),
      )
    : artists;

  return {
    data: filtered.map(normalizeArtist),
    total: filtered.length,
    page: options.page ?? 1,
    limit: options.limit ?? filtered.length,
  };
}

export async function getArtistById(id: number): Promise<Artist | null> {
  try {
    return normalizeArtist(await apiRequest<Artist>(`/artists/${id}`));
  } catch {
    return null;
  }
}

export async function getArtistSongs(artistId: number): Promise<Song[]> {
  const songs = await getSongs({ artistId, limit: 100 });
  return songs.data;
}

export async function getArtistAlbums(artistId: number): Promise<Album[]> {
  const albums = await getAlbums({ artistId, limit: 100 });
  return albums.data;
}

export async function getAlbums(options: {
  artistId?: number;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Album[]; total: number; page: number; limit: number }> {
  const query = buildQuery({
    artistId: options.artistId,
    page: options.page ?? 1,
    limit: options.limit ?? 20,
  });
  const response = await apiRequest<PaginatedResponse<Album>>(`/albums?${query}`);

  return {
    data: response.data.map(normalizeAlbum),
    total: response.meta.total,
    page: response.meta.page,
    limit: response.meta.limit,
  };
}

export async function getAlbumById(id: number): Promise<Album | null> {
  try {
    return normalizeAlbum(await apiRequest<Album>(`/albums/${id}`));
  } catch {
    return null;
  }
}

export async function getSongs(options: {
  query?: string;
  artistId?: number;
  albumId?: number;
  page?: number;
  limit?: number;
} = {}): Promise<{ data: Song[]; total: number; page: number; limit: number }> {
  const query = buildQuery({
    q: options.query,
    artistId: options.artistId,
    albumId: options.albumId,
    page: options.page ?? 1,
    limit: options.limit ?? 20,
  });
  const response = await apiRequest<PaginatedResponse<Song>>(`/songs?${query}`);

  return {
    data: response.data.map(normalizeSong),
    total: response.meta.total,
    page: response.meta.page,
    limit: response.meta.limit,
  };
}

export async function getSongById(id: number): Promise<Song | null> {
  try {
    return normalizeSong(await apiRequest<Song>(`/songs/${id}`));
  } catch {
    return null;
  }
}

export async function search(
  query: string,
  type: 'artists' | 'albums' | 'songs' | 'all' = 'all',
): Promise<{
  artists: Artist[];
  albums: Album[];
  songs: Song[];
}> {
  if (query.trim().length < 2) {
    return { artists: [], albums: [], songs: [] };
  }

  const response = await apiRequest<{
    artists: Artist[];
    albums: Album[];
    songs: Song[];
  }>(`/search?${buildQuery({ q: query, type })}`);

  return {
    artists: response.artists.map(normalizeArtist),
    albums: response.albums.map(normalizeAlbum),
    songs: response.songs.map(normalizeSong),
  };
}

export async function followArtist(artistId: number) {
  const response = await apiRequest<{ following: boolean }>(
    `/social/follow/artists/${artistId}`,
    { method: 'POST' },
  );

  return {
    ...response,
    success: true,
    action: response.following ? 'followed' : 'unfollowed',
  };
}

export function checkFollowingArtist(artistId: number) {
  return apiRequest<{ following: boolean }>(
    `/social/follow/artists/${artistId}/status`,
  );
}

export function getArtistFollowerCount(artistId: number) {
  return apiRequest<{ count: number }>(`/social/follow/artists/${artistId}/count`);
}

export async function likeContent(type: ItemType, id: number) {
  const response = await apiRequest<{ liked: boolean }>(
    `/social/likes/${type}/${id}`,
    { method: 'POST' },
  );

  return {
    ...response,
    success: true,
    action: response.liked ? 'liked' : 'unliked',
  };
}

export function checkLikedContent(type: ItemType, id: number) {
  return apiRequest<{ liked: boolean }>(`/social/likes/${type}/${id}/status`);
}

export function getContentLikeCount(type: ItemType, id: number) {
  return apiRequest<{ count: number }>(`/social/likes/${type}/${id}/count`);
}

export interface SocialComment {
  comment_id: string;
  user_id: string;
  user_name: string;
  created_at: string;
  text: string;
}

function normalizeSocialComment(comment: {
  id: number;
  user: { id: number; display_name: string | null };
  created_at: string;
  content: string;
}): SocialComment {
  return {
    comment_id: String(comment.id),
    user_id: String(comment.user.id),
    user_name: comment.user.display_name || 'User',
    created_at: comment.created_at,
    text: comment.content,
  };
}

export async function addComment(type: ItemType, id: number, content: string) {
  const comment = await apiRequest<{
    id: number;
    user: { id: number; display_name: string | null };
    created_at: string;
    content: string;
  }>(`/social/comments/${type}/${id}`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

  return { success: true, comment: normalizeSocialComment(comment) };
}

export async function getComments(type: ItemType, id: number, limit = 50) {
  const response = await apiRequest<
    PaginatedResponse<{
      id: number;
      user: { id: number; display_name: string | null };
      created_at: string;
      content: string;
    }>
  >(`/social/comments/${type}/${id}?${buildQuery({ limit })}`);

  return {
    comments: response.data.map(normalizeSocialComment),
    lastKey: null,
    count: response.meta.total,
  };
}

export function deleteComment(type: ItemType, id: number, commentId: string) {
  return apiRequest<{ id: number }>(`/social/comments/${type}/${id}/${commentId}`, {
    method: 'DELETE',
  }).then(() => ({ success: true, message: 'Comment deleted' }));
}

function normalizePoll(poll: {
  id: number;
  title: string;
  category: 'ARTIST' | 'ALBUM' | 'SONG';
  period: 'MONTHLY' | 'YEARLY';
  status: 'ACTIVE' | 'CLOSED';
  starts_at: string;
  ends_at: string;
  created_at: string;
  nominees: Array<{
    id: number;
    item_id: number;
    item_name: string;
    item_image: string | null;
    votes_count: number;
  }>;
}): Poll {
  const totalVotes = poll.nominees.reduce(
    (sum, nominee) => sum + nominee.votes_count,
    0,
  );

  return {
    id: poll.id,
    title: poll.title,
    category: poll.category,
    period: poll.period,
    status: poll.status,
    starts_at: poll.starts_at,
    ends_at: poll.ends_at,
    total_votes: totalVotes,
    created_at: poll.created_at,
    nominees: poll.nominees.map((nominee) => ({
      id: nominee.id,
      item_id: nominee.item_id,
      item_name: nominee.item_name,
      item_image: nominee.item_image || '/placeholder.svg',
      votes_count: nominee.votes_count,
      percentage: totalVotes > 0 ? (nominee.votes_count / totalVotes) * 100 : 0,
    })),
  };
}

export async function getActivePolls(category?: 'ARTIST' | 'ALBUM' | 'SONG'): Promise<{ polls: Poll[] }> {
  const polls = await apiRequest<Parameters<typeof normalizePoll>[0][]>(
    '/voting/polls',
  );
  const normalizedPolls = polls.map(normalizePoll);

  return {
    polls: category
      ? normalizedPolls.filter((poll) => poll.category === category)
      : normalizedPolls,
  };
}

export async function castVote(
  pollId: number,
  nomineeId: number,
): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    await apiRequest(`/voting/polls/${pollId}/vote`, {
      method: 'POST',
      body: JSON.stringify({ nominee_id: nomineeId }),
    });
    return { success: true, message: 'Vote submitted' };
  } catch (error) {
    return {
      success: false,
      message: '',
      error: error instanceof Error ? error.message : 'Failed to vote',
    };
  }
}

export async function getUserVotes(): Promise<{ votes: UserVote[] }> {
  const votes = await apiRequest<UserVote[]>('/voting/user/votes');
  return { votes };
}

export async function getUserMonthlyVotes(): Promise<{ votes: MonthlyVote[] }> {
  const votes = await apiRequest<MonthlyVote[]>('/voting/monthly/my-votes');
  return { votes };
}

export async function voteForItem(type: VotableType, id: number) {
  try {
    await apiRequest('/voting/monthly/vote', {
      method: 'POST',
      body: JSON.stringify({ item_type: type, item_id: id }),
    });
    return { success: true, message: 'Vote added' };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to vote';

    return {
      success: false,
      message: '',
      error: message,
      already_voted: message.toLowerCase().includes('already voted'),
    };
  }
}

export async function getUserItemVotes(): Promise<{
  votes: { song?: number[]; album?: number[]; artist?: number[] };
}> {
  const votes = await apiRequest<
    Array<{ item_type: 'ARTIST' | 'ALBUM' | 'SONG'; item_id: number }>
  >('/voting/monthly/my-votes');
  const grouped: { song?: number[]; album?: number[]; artist?: number[] } = {};

  for (const vote of votes) {
    const key = vote.item_type.toLowerCase() as VotableType;
    grouped[key] = [...(grouped[key] ?? []), vote.item_id];
  }

  return { votes: grouped };
}

export async function getItemVoteCount(type: VotableType, id: number) {
  const response = await apiRequest<{ count: number }>(
    `/voting/monthly/${type}/${id}/count`,
  );
  return { item_id: id, item_type: type, vote_count: response.count };
}

export async function getTopVotedItems(
  category: VotableType | 'all' = 'all',
  limit = 5,
) {
  const type = category === 'all' ? undefined : category;
  const topItems = await apiRequest<
    Array<{
      item_type: 'ARTIST' | 'ALBUM' | 'SONG';
      item_id: number;
      item_name: string;
      item_image: string | null;
      count: number;
    }>
  >(`/voting/monthly/top?${buildQuery({ type, limit })}`);

  return {
    top: {
      song: topItems
        .filter((item) => item.item_type === 'SONG')
        .map((item) => ({
          id: item.item_id,
          title: item.item_name,
          primary_artist_name: '',
          song_art_image_url: item.item_image || '/placeholder.svg',
          vote_count: item.count,
        })),
      album: topItems
        .filter((item) => item.item_type === 'ALBUM')
        .map((item) => ({
          id: item.item_id,
          name: item.item_name,
          artist_name: '',
          cover_art_url: item.item_image || '/placeholder.svg',
          vote_count: item.count,
        })),
      artist: topItems
        .filter((item) => item.item_type === 'ARTIST')
        .map((item) => ({
          id: item.item_id,
          name: item.item_name,
          image_url: item.item_image || '/placeholder.svg',
          vote_count: item.count,
        })),
    },
  };
}

function normalizeBlogPost(post: {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string;
  cover_image: string | null;
  status: 'DRAFT' | 'PUBLISHED';
  artist: { id: number };
  tags: string[];
  published_at: string | null;
  updated_at: string;
  author: { id: number; email: string; display_name: string | null; avatar_url: string | null };
  counts: { likes: number; comments: number };
}): BlogPost {
  return {
    id: String(post.id),
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt ?? '',
    content: post.content ?? '',
    coverImage: post.cover_image ?? '/placeholder.svg',
    status: post.status,
    artistId: post.artist.id,
    authorId: post.author.id,
    authorName: post.author.display_name || post.author.email,
    authorImage: post.author.avatar_url || '/placeholder.svg',
    tags: post.tags,
    publishedAt: post.published_at ?? post.updated_at,
    updatedAt: post.updated_at,
    isPublished: post.status === 'PUBLISHED',
    viewCount: 0,
    likeCount: post.counts.likes,
    commentCount: post.counts.comments,
  };
}

export async function getBlogPosts(options: {
  limit?: number;
  tag?: string;
  artistId?: number;
} = {}): Promise<BlogPost[]> {
  const response = await apiRequest<PaginatedResponse<Parameters<typeof normalizeBlogPost>[0]>>(
    `/blog?${buildQuery(options)}`,
  );
  return response.data.map(normalizeBlogPost);
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    return normalizeBlogPost(await apiRequest<Parameters<typeof normalizeBlogPost>[0]>(`/blog/${slug}`));
  } catch {
    return null;
  }
}

export async function createBlogPost(data: CreateBlogPostInput): Promise<BlogPost> {
  const response = await apiRequest<Parameters<typeof normalizeBlogPost>[0]>('/blog', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return normalizeBlogPost(response);
}

export async function updateBlogPost(
  slug: string,
  data: UpdateBlogPostInput,
): Promise<BlogPost> {
  const response = await apiRequest<Parameters<typeof normalizeBlogPost>[0]>(`/blog/${slug}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  return normalizeBlogPost(response);
}

export async function getBlogPostForEdit(slug: string): Promise<BlogPost> {
  return normalizeBlogPost(
    await apiRequest<Parameters<typeof normalizeBlogPost>[0]>(`/blog/${slug}/edit`),
  );
}

export function likeBlogPost(slug: string): Promise<{ liked: boolean; count: number }> {
  return apiRequest<{ liked: boolean; count: number }>(`/blog/${slug}/like`, {
    method: 'POST',
  });
}

export function saveBlogPost(slug: string): Promise<{ saved: boolean; count: number }> {
  return apiRequest<{ saved: boolean; count: number }>(`/blog/${slug}/save`, {
    method: 'POST',
  });
}

export function getBlogPostStatus(
  slug: string,
): Promise<{ liked: boolean; saved: boolean }> {
  return apiRequest<{ liked: boolean; saved: boolean }>(`/blog/${slug}/status`);
}

export async function getBlogStats(): Promise<BlogStats> {
  const posts = await getBlogPosts();
  return {
    totalPosts: posts.length,
    totalViews: 0,
    totalLikes: posts.reduce((sum, post) => sum + post.likeCount, 0),
    totalComments: posts.reduce((sum, post) => sum + post.commentCount, 0),
  };
}

export async function getBlogComments(slug: string): Promise<BlogComment[]> {
  const response = await apiRequest<
    PaginatedResponse<{
      id: number;
      post_id: number;
      content: string;
      created_at: string;
      user: { id: number; display_name: string | null; avatar_url: string | null };
    }>
  >(`/blog/${slug}/comments`);
  return response.data.map((comment) => ({
    id: String(comment.id),
    postId: String(comment.post_id),
    userId: String(comment.user.id),
    userName: comment.user.display_name || 'User',
    userImage: comment.user.avatar_url || '/placeholder.svg',
    content: comment.content,
    createdAt: comment.created_at,
    likes: 0,
  }));
}

export async function createBlogComment(
  slug: string,
  content: string,
): Promise<BlogComment> {
  const comment = await apiRequest<{
    id: number;
    post_id: number;
    content: string;
    created_at: string;
    user: { id: number; display_name: string | null; avatar_url: string | null };
  }>(`/blog/${slug}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });

  return {
    id: String(comment.id),
    postId: String(comment.post_id),
    userId: String(comment.user.id),
    userName: comment.user.display_name || 'User',
    userImage: comment.user.avatar_url || '/placeholder.svg',
    content: comment.content,
    createdAt: comment.created_at,
    likes: 0,
  };
}

export const addBlogComment = createBlogComment;

export async function deleteBlogComment(
  slug: string,
  commentId: number,
): Promise<void> {
  await apiRequest(`/blog/${slug}/comments/${commentId}`, {
    method: 'DELETE',
  });
}

export function getAdminUsers(params: {
  page?: number;
  limit?: number;
  role?: Role;
  q?: string;
} = {}): Promise<{ data: AdminUser[]; meta: PaginationMeta }> {
  return apiRequest<ApiPaginatedResponse<AdminUser>>(
    `/admin/users?${buildQuery(params)}`,
  ).then((response) => ({
    data: response.data,
    meta: normalizePaginationMeta(response.meta),
  }));
}

export function getAdminStats(): Promise<{
  total_artists: number;
  associated_artists: number;
  unassociated_artists: number;
}> {
  return Promise.all([
    apiRequest<{
      artists: { total: number };
    }>('/admin/stats'),
    getArtistUserAssociations(),
  ]).then(([stats, associations]) => ({
    total_artists: stats.artists.total,
    associated_artists: associations.associations.length,
    unassociated_artists: Math.max(
      0,
      stats.artists.total - associations.associations.length,
    ),
  }));
}

export function getAdminDashboardStats(): Promise<AdminStats> {
  return apiRequest<AdminStats>('/admin/stats');
}

export function searchAdminUsers(q: string) {
  return getAdminUsers({ q, limit: 20 });
}

export function updateAdminUserRole(userId: number, role: Role) {
  return apiRequest<AdminUser>(`/admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function deleteAdminUser(userId: number): Promise<void> {
  await apiRequest(`/admin/users/${userId}`, {
    method: 'DELETE',
  });
}

export function getArtistUserAssociations() {
  return apiRequest<ArtistUserAssociation[]>('/admin/artist-users').then(
    (associations) => ({ associations }),
  );
}

export async function associateArtistWithUser(
  artistId: number,
  userId: number,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiRequest('/admin/artist-users', {
      method: 'POST',
      body: JSON.stringify({ artist_id: artistId, user_id: userId }),
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to associate',
    };
  }
}

export async function removeArtistAssociation(artistId: number) {
  try {
    await apiRequest(`/admin/artist-users/${artistId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove',
    };
  }
}

export function getAdminGeniusProfile(artistId: number) {
  return apiRequest<GeniusArtistProfile | null>(
    `/admin/artists/${artistId}/genius-profile`,
  );
}

export function previewAdminGeniusArtist(artistId: number, url: string) {
  return apiRequest<GeniusArtistPreview>(
    `/admin/artists/${artistId}/genius-preview`,
    {
      method: 'POST',
      body: JSON.stringify({ url }),
    },
  );
}

export function syncAdminGeniusArtist(artistId: number, url: string) {
  return apiRequest<GeniusArtistSyncResponse>(
    `/admin/artists/${artistId}/genius-sync`,
    {
      method: 'POST',
      body: JSON.stringify({ url }),
    },
  );
}

export function getMyArtistProfile() {
  const currentUser = getStoredAuthUser();

  if (!currentUser) {
    return Promise.resolve(null);
  }

  return apiRequest<Artist[]>('/artists').then((artists) => {
    const artist = artists.find((item) => item.user_id === currentUser.id);
    return artist
      ? { artist: normalizeArtist(artist), association: { artist_id: artist.id } }
      : null;
  });
}
