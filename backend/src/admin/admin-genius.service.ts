import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ExternalProvider } from '@prisma/client';
import { load } from 'cheerio';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeSlug } from '../common/utils/slug.util';
import { GeniusArtistUrlDto } from './dto/genius-artist-url.dto';
import {
  GeniusCatalogImportStats,
  GeniusArtistPreviewResponse,
  GeniusArtistProfileResponse,
  GeniusArtistSyncResponse,
} from './entities/admin.response';

type JsonObject = Record<string, unknown>;

type GeniusArtistPreviewInternal = GeniusArtistPreviewResponse & {
  raw_data: Prisma.InputJsonValue;
};

const GENIUS_BASE_URL = 'https://genius.com';
const REQUEST_HEADERS = {
  Accept: 'application/json, text/plain, */*',
  'User-Agent': 'LyricsScape/1.0 admin-enrichment',
  'X-Requested-With': 'XMLHttpRequest',
};
const HTML_REQUEST_HEADERS = {
  Accept: 'text/html,application/xhtml+xml',
  Referer: GENIUS_BASE_URL,
  'User-Agent': REQUEST_HEADERS['User-Agent'],
};

const MOROCCO_KEYWORDS = [
  'morocco',
  'moroccan',
  'maroc',
  'casablanca',
  'rabat',
  'marrakech',
  'fez',
  'tanger',
  'agadir',
  'الدار البيضاء',
  'الرباط',
  'مراكش',
  'المغرب',
];

const ARABIC_RE = /[\u0600-\u06ff]/;
const GENIUS_PROVIDER: ExternalProvider = 'GENIUS';
const SONGS_PER_PAGE = 50;
const SONG_PAGE_LIMIT = 4;
const ALBUMS_PER_PAGE = 20;
const ALBUM_PAGE_LIMIT = 4;

const geniusProfileSelect = {
  id: true,
  artist_id: true,
  provider: true,
  external_id: true,
  url: true,
  slug: true,
  last_synced_at: true,
  created_at: true,
  updated_at: true,
} satisfies Prisma.ArtistExternalProfileSelect;

const syncedArtistSelect = {
  id: true,
  name: true,
  slug: true,
  image_url: true,
  header_image_url: true,
  bio: true,
  is_verified: true,
  instagram: true,
  twitter: true,
} satisfies Prisma.ArtistSelect;

@Injectable()
export class AdminGeniusService {
  constructor(private readonly prisma: PrismaService) {}

  async findProfile(
    artistId: number,
  ): Promise<GeniusArtistProfileResponse | null> {
    await this.ensureArtistExists(artistId);

    return this.prisma.artistExternalProfile.findUnique({
      where: {
        artist_id_provider: {
          artist_id: artistId,
          provider: GENIUS_PROVIDER,
        },
      },
      select: geniusProfileSelect,
    });
  }

  async previewArtist(
    artistId: number,
    dto: GeniusArtistUrlDto,
  ): Promise<GeniusArtistPreviewResponse> {
    await this.ensureArtistExists(artistId);
    const preview = await this.fetchGeniusArtist(dto.url);
    return this.toPublicPreview(preview);
  }

  async syncArtist(
    artistId: number,
    dto: GeniusArtistUrlDto,
  ): Promise<GeniusArtistSyncResponse> {
    await this.ensureArtistExists(artistId);
    const preview = await this.fetchGeniusArtist(dto.url);
    const now = new Date();
    const artistUpdateData = this.buildArtistUpdateData(preview);

    const [profile, updatedArtist] = await this.prisma.$transaction([
      this.prisma.artistExternalProfile.upsert({
        where: {
          artist_id_provider: {
            artist_id: artistId,
            provider: GENIUS_PROVIDER,
          },
        },
        create: {
          artist_id: artistId,
          provider: GENIUS_PROVIDER,
          external_id: preview.external_id,
          url: preview.url,
          slug: preview.slug,
          raw_data: preview.raw_data,
          last_synced_at: now,
        },
        update: {
          external_id: preview.external_id,
          url: preview.url,
          slug: preview.slug,
          raw_data: preview.raw_data,
          last_synced_at: now,
        },
        select: geniusProfileSelect,
      }),
      this.prisma.artist.update({
        where: { id: artistId },
        data: artistUpdateData,
        select: syncedArtistSelect,
      }),
    ]);

    const imported = await this.importCatalog(artistId, preview);

    return {
      profile,
      preview: this.toPublicPreview(preview),
      imported,
      updated_artist: updatedArtist,
    };
  }

  private async importCatalog(
    artistId: number,
    preview: GeniusArtistPreviewInternal,
  ): Promise<GeniusCatalogImportStats> {
    const stats: GeniusCatalogImportStats = {
      albums_created: 0,
      albums_updated: 0,
      songs_created: 0,
      songs_updated: 0,
      songs_skipped: 0,
      lyrics_imported: 0,
      lyrics_skipped: 0,
    };
    const albumIdMap = new Map<string, number>();
    const geniusArtistId = Number(preview.external_id);
    const artistSlug = preview.slug ?? normalizeSlug(preview.name);
    const albums = await this.fetchArtistAlbums(geniusArtistId);

    for (const album of albums) {
      const importedAlbum = await this.upsertGeniusAlbum(
        artistId,
        artistSlug,
        album,
        stats,
      );

      if (importedAlbum.externalId) {
        albumIdMap.set(importedAlbum.externalId, importedAlbum.albumId);
      }
    }

    const songs = await this.fetchArtistSongs(geniusArtistId);

    for (const song of songs) {
      const primaryArtist = getObject(song, 'primary_artist');
      const primaryArtistId = primaryArtist ? getNumber(primaryArtist, 'id') : null;

      if (primaryArtistId !== geniusArtistId) {
        stats.songs_skipped += 1;
        continue;
      }

      await this.upsertGeniusSong(
        artistId,
        artistSlug,
        song,
        albumIdMap,
        stats,
      );
    }

    return stats;
  }

  private async fetchArtistAlbums(artistId: number): Promise<JsonObject[]> {
    const albums: JsonObject[] = [];

    for (let page = 1; page <= ALBUM_PAGE_LIMIT; page += 1) {
      const url = new URL(`/api/artists/${artistId}/albums`, GENIUS_BASE_URL);
      url.search = new URLSearchParams({
        page: String(page),
        per_page: String(ALBUMS_PER_PAGE),
      }).toString();

      const json = await this.fetchJson(url.toString());
      const response = getObject(json, 'response');
      const pageAlbums = response ? getArray(response, 'albums') : [];

      if (pageAlbums.length === 0) {
        break;
      }

      for (const album of pageAlbums) {
        if (isRecord(album)) {
          albums.push(album);
        }
      }
    }

    return albums;
  }

  private async fetchArtistSongs(artistId: number): Promise<JsonObject[]> {
    const songs: JsonObject[] = [];
    const seen = new Set<number>();

    for (let page = 1; page <= SONG_PAGE_LIMIT; page += 1) {
      const url = new URL(`/api/artists/${artistId}/songs`, GENIUS_BASE_URL);
      url.search = new URLSearchParams({
        page: String(page),
        per_page: String(SONGS_PER_PAGE),
        sort: 'popularity',
      }).toString();

      const json = await this.fetchJson(url.toString());
      const response = getObject(json, 'response');
      const pageSongs = response ? getArray(response, 'songs') : [];

      if (pageSongs.length === 0) {
        break;
      }

      for (const song of pageSongs) {
        if (!isRecord(song)) {
          continue;
        }

        const songId = getNumber(song, 'id');
        if (!songId || seen.has(songId)) {
          continue;
        }

        seen.add(songId);
        songs.push(song);
      }
    }

    return songs;
  }

  private async upsertGeniusAlbum(
    artistId: number,
    artistSlug: string,
    album: JsonObject,
    stats: GeniusCatalogImportStats,
  ): Promise<{ albumId: number; externalId: string | null }> {
    const externalId = getNumber(album, 'id');
    const name = getString(album, 'name') ?? getString(album, 'full_title');

    if (!externalId || !name) {
      return { albumId: 0, externalId: null };
    }

    const slug = normalizeSlug(`${artistSlug}-${name}-${externalId}`);
    const existingAlbum = await this.prisma.album.findUnique({
      where: { slug },
      select: { id: true },
    });

    const savedAlbum = await this.prisma.album.upsert({
      where: { slug },
      create: {
        name,
        slug,
        cover_art_url: getString(album, 'cover_art_url'),
        release_date: this.getReleaseDate(album),
        artist_id: artistId,
      },
      update: {
        name,
        cover_art_url: getString(album, 'cover_art_url'),
        release_date: this.getReleaseDate(album),
        artist_id: artistId,
      },
      select: { id: true },
    });

    if (existingAlbum) {
      stats.albums_updated += 1;
    } else {
      stats.albums_created += 1;
    }

    return {
      albumId: savedAlbum.id,
      externalId: String(externalId),
    };
  }

  private async upsertGeniusSong(
    artistId: number,
    artistSlug: string,
    song: JsonObject,
    albumIdMap: Map<string, number>,
    stats: GeniusCatalogImportStats,
  ): Promise<void> {
    const externalId = getNumber(song, 'id');
    const title = getString(song, 'title');

    if (!externalId || !title) {
      stats.songs_skipped += 1;
      return;
    }

    const slug = normalizeSlug(`${artistSlug}-${title}-${externalId}`);
    const album = getObject(song, 'album');
    const albumId = album
      ? await this.resolveSongAlbumId(artistId, artistSlug, album, albumIdMap, stats)
      : null;
    const lyrics = await this.fetchSongLyrics(song);
    const existingSong = await this.prisma.song.findUnique({
      where: { slug },
      select: { id: true },
    });

    await this.prisma.song.upsert({
      where: { slug },
      create: {
        title,
        slug,
        lyrics,
        song_art_image_url: getString(song, 'song_art_image_url'),
        release_date: this.getReleaseDate(song),
        primary_artist_id: artistId,
        album_id: albumId,
      },
      update: {
        title,
        ...(lyrics ? { lyrics } : {}),
        song_art_image_url: getString(song, 'song_art_image_url'),
        release_date: this.getReleaseDate(song),
        primary_artist_id: artistId,
        album_id: albumId,
      },
      select: { id: true },
    });

    if (existingSong) {
      stats.songs_updated += 1;
    } else {
      stats.songs_created += 1;
    }

    if (lyrics) {
      stats.lyrics_imported += 1;
    } else {
      stats.lyrics_skipped += 1;
    }
  }

  private async fetchSongLyrics(song: JsonObject): Promise<string | null> {
    const songUrl = this.resolveGeniusSongUrl(song);

    if (!songUrl) {
      return null;
    }

    try {
      const html = await this.fetchHtml(songUrl);
      return this.extractLyricsFromHtml(html);
    } catch {
      return null;
    }
  }

  private resolveGeniusSongUrl(song: JsonObject): string | null {
    const url = getString(song, 'url');
    if (url) {
      return url;
    }

    const path = getString(song, 'path');
    if (!path) {
      return null;
    }

    return path.startsWith('http') ? path : `${GENIUS_BASE_URL}${path}`;
  }

  private extractLyricsFromHtml(html: string): string | null {
    const $ = load(html);
    const lyricContainers = $('div[data-lyrics-container]');
    const rawLyrics =
      lyricContainers.length > 0
        ? lyricContainers
            .toArray()
            .map((element) =>
              this.extractTextWithLineBreaks($(element).html() ?? '').trim(),
            )
            .filter(Boolean)
            .join('\n\n')
        : $('.lyrics').text().trim() ||
          this.extractTextWithLineBreaks(
            $('div[class*="Lyrics__Root"]').html() ?? '',
          );
    const lyrics = this.cleanLyrics(rawLyrics);

    return lyrics || null;
  }

  private extractTextWithLineBreaks(html: string): string {
    const normalizedHtml = html
      .replace(/<br\s*\/?\s*>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n');

    return load(`<div>${normalizedHtml}</div>`)
      .text()
      .replace(/\u00a0/g, ' ');
  }

  private cleanLyrics(rawLyrics: string): string {
    const lines = rawLyrics
      .replace(/\r\n/g, '\n')
      .replace(/([a-z0-9)])(\[[^\]]+\])/gi, '$1\n$2')
      .replace(/\u00a0/g, ' ')
      .split('\n')
      .map((line) => line.trimEnd());
    const firstSectionIndex = lines.findIndex((line) =>
      /^\s*\[[^\]]+\]/.test(line),
    );
    const candidateLines =
      firstSectionIndex >= 0
        ? lines.slice(firstSectionIndex)
        : lines.filter((line) => {
            const trimmed = line.trim();

            return (
              trimmed !== '' &&
              !/^\d+\s+Contributors?$/.test(trimmed) &&
              !trimmed.endsWith(' Lyrics') &&
              !/Read More|Embed$/i.test(trimmed)
            );
          });

    return candidateLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  private async resolveSongAlbumId(
    artistId: number,
    artistSlug: string,
    album: JsonObject,
    albumIdMap: Map<string, number>,
    stats: GeniusCatalogImportStats,
  ): Promise<number | null> {
    const externalAlbumId = getNumber(album, 'id');

    if (!externalAlbumId) {
      return null;
    }

    const mappedAlbumId = albumIdMap.get(String(externalAlbumId));
    if (mappedAlbumId) {
      return mappedAlbumId;
    }

    const importedAlbum = await this.upsertGeniusAlbum(
      artistId,
      artistSlug,
      album,
      stats,
    );

    if (importedAlbum.externalId) {
      albumIdMap.set(importedAlbum.externalId, importedAlbum.albumId);
    }

    return importedAlbum.albumId || null;
  }

  private getReleaseDate(source: JsonObject): string | null {
    const displayDate =
      getString(source, 'release_date_for_display') ??
      getString(source, 'release_date');

    if (displayDate) {
      return displayDate;
    }

    const components = getObject(source, 'release_date_components');
    if (!components) {
      return null;
    }

    const year = getNumber(components, 'year');
    const month = getNumber(components, 'month');
    const day = getNumber(components, 'day');

    if (!year) {
      return null;
    }

    if (month && day) {
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    if (month) {
      return `${year}-${String(month).padStart(2, '0')}`;
    }

    return String(year);
  }

  private async ensureArtistExists(artistId: number): Promise<void> {
    const artist = await this.prisma.artist.findUnique({
      where: { id: artistId },
      select: { id: true },
    });

    if (!artist) {
      throw new NotFoundException('Artist not found');
    }
  }

  private async fetchGeniusArtist(
    rawUrl: string,
  ): Promise<GeniusArtistPreviewInternal> {
    const slug = this.parseGeniusArtistSlug(rawUrl);
    const artistId = await this.resolveArtistId(slug);
    const artist = await this.fetchArtistDetail(artistId);

    return this.normalizeArtist(artist, rawUrl);
  }

  private parseGeniusArtistSlug(rawUrl: string): string {
    let url: URL;

    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException('Invalid Genius artist URL');
    }

    if (!url.hostname.endsWith('genius.com')) {
      throw new BadRequestException('URL must be a Genius artist URL');
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const artistsIndex = parts.findIndex((part) => part === 'artists');
    const slug = artistsIndex >= 0 ? parts[artistsIndex + 1] : undefined;

    if (!slug) {
      throw new BadRequestException('URL must point to a Genius artist page');
    }

    return slug;
  }

  private async resolveArtistId(slug: string): Promise<number> {
    const query = slug.replace(/-/g, ' ');
    const searchUrl = new URL('/api/search/multi', GENIUS_BASE_URL);
    searchUrl.search = new URLSearchParams({
      q: query,
      per_page: '5',
      experiment: 'not-eligible',
    }).toString();

    const json = await this.fetchJson(searchUrl.toString());
    const response = getObject(json, 'response');
    const sections = response ? getArray(response, 'sections') : [];
    const candidates: JsonObject[] = [];

    for (const sectionValue of sections) {
      if (!isRecord(sectionValue)) {
        continue;
      }

      if (getString(sectionValue, 'type') !== 'artist') {
        continue;
      }

      for (const hitValue of getArray(sectionValue, 'hits')) {
        if (!isRecord(hitValue)) {
          continue;
        }

        const result = getObject(hitValue, 'result');
        if (result) {
          candidates.push(result);
        }
      }
    }

    const normalizedWantedSlug = normalizeText(slug.replace(/-/g, ' '));
    const exact = candidates.find((candidate) => {
      const candidateSlug = getString(candidate, 'slug');
      const candidateName = getString(candidate, 'name');
      return (
        normalizeText(candidateSlug ?? '') === normalizedWantedSlug ||
        normalizeText(candidateName ?? '') === normalizedWantedSlug
      );
    });

    const best = exact ?? this.pickBestCandidate(candidates);
    const id = best ? getNumber(best, 'id') : null;

    if (!id) {
      throw new BadGatewayException('Genius artist could not be resolved');
    }

    return id;
  }

  private pickBestCandidate(candidates: JsonObject[]): JsonObject | null {
    if (candidates.length === 0) {
      return null;
    }

    return [...candidates].sort((a, b) => {
      const verifiedScore =
        Number(getBoolean(b, 'is_verified')) - Number(getBoolean(a, 'is_verified'));
      if (verifiedScore !== 0) {
        return verifiedScore;
      }

      return (getNumber(b, 'iq') ?? 0) - (getNumber(a, 'iq') ?? 0);
    })[0];
  }

  private async fetchArtistDetail(artistId: number): Promise<JsonObject> {
    const json = await this.fetchJson(
      `${GENIUS_BASE_URL}/api/artists/${artistId}`,
    );
    const response = getObject(json, 'response');
    const artist = response ? getObject(response, 'artist') : null;

    if (!artist) {
      throw new BadGatewayException('Genius artist details unavailable');
    }

    return artist;
  }

  private async fetchJson(url: string): Promise<JsonObject> {
    let waitMs = 500;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await fetch(url, { headers: REQUEST_HEADERS });

      if (response.status === 429 && attempt < 5) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        await this.sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : waitMs);
        waitMs *= 2;
        continue;
      }

      if (!response.ok) {
        throw new BadGatewayException(
          `Genius request failed with status ${response.status}`,
        );
      }

      const json: unknown = await response.json();

      if (!isRecord(json)) {
        throw new BadGatewayException('Invalid Genius response');
      }

      return json;
    }

    throw new BadGatewayException('Genius rate limit retry exhausted');
  }

  private async fetchHtml(url: string): Promise<string> {
    let waitMs = 500;

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await fetch(url, { headers: HTML_REQUEST_HEADERS });

      if (response.status === 429 && attempt < 5) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        await this.sleep(Number.isFinite(retryAfter) ? retryAfter * 1000 : waitMs);
        waitMs *= 2;
        continue;
      }

      if (!response.ok) {
        throw new BadGatewayException(
          `Genius lyrics request failed with status ${response.status}`,
        );
      }

      return response.text();
    }

    throw new BadGatewayException('Genius lyrics rate limit retry exhausted');
  }

  private normalizeArtist(
    artist: JsonObject,
    fallbackUrl: string,
  ): GeniusArtistPreviewInternal {
    const description = getObject(artist, 'description');
    const alternateNames = getArray(artist, 'alternate_names')
      .map((value) => (typeof value === 'string' ? value : null))
      .filter((value): value is string => value !== null);
    const descriptionMarkdown = description
      ? getString(description, 'markdown')
      : null;
    const descriptionPreview = getString(artist, 'description_preview');
    const externalId = getNumber(artist, 'id');

    if (!externalId) {
      throw new BadGatewayException('Genius artist details are missing an ID');
    }

    const textBlob = [
      descriptionMarkdown,
      descriptionPreview,
      alternateNames.join(' '),
      getString(artist, 'name'),
    ]
      .filter((value): value is string => Boolean(value))
      .join(' ');

    return {
      provider: GENIUS_PROVIDER,
      external_id: String(externalId),
      name: getString(artist, 'name') ?? 'Unknown Genius Artist',
      slug: getString(artist, 'slug'),
      url: getString(artist, 'url') ?? fallbackUrl,
      image_url: getString(artist, 'image_url'),
      header_image_url: getString(artist, 'header_image_url'),
      is_verified: getBoolean(artist, 'is_verified') ?? false,
      followers_count: getNumber(artist, 'followers_count'),
      iq: getNumber(artist, 'iq'),
      alternate_names: alternateNames,
      description_markdown: descriptionMarkdown,
      description_preview: descriptionPreview,
      instagram: getString(artist, 'instagram_name'),
      twitter: getString(artist, 'twitter_name'),
      facebook: getString(artist, 'facebook_name'),
      has_arabic: ARABIC_RE.test(textBlob),
      likely_moroccan: MOROCCO_KEYWORDS.some((keyword) =>
        normalizeText(textBlob).includes(normalizeText(keyword)),
      ),
      raw_data: artist as Prisma.InputJsonValue,
    };
  }

  private buildArtistUpdateData(
    preview: GeniusArtistPreviewInternal,
  ): Prisma.ArtistUpdateInput {
    const data: Prisma.ArtistUpdateInput = {
      is_verified: preview.is_verified,
    };

    if (preview.image_url) {
      data.image_url = preview.image_url;
    }

    if (preview.header_image_url) {
      data.header_image_url = preview.header_image_url;
    }

    const bio = preview.description_markdown ?? preview.description_preview;
    if (bio) {
      data.bio = bio;
    }

    if (preview.instagram) {
      data.instagram = preview.instagram;
    }

    if (preview.twitter) {
      data.twitter = preview.twitter;
    }

    return data;
  }

  private toPublicPreview(
    preview: GeniusArtistPreviewInternal,
  ): GeniusArtistPreviewResponse {
    const { raw_data: _rawData, ...publicPreview } = preview;
    return publicPreview;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}

function isRecord(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getObject(source: JsonObject, key: string): JsonObject | null {
  const value = source[key];
  return isRecord(value) ? value : null;
}

function getArray(source: JsonObject, key: string): unknown[] {
  const value = source[key];
  return Array.isArray(value) ? value : [];
}

function getString(source: JsonObject, key: string): string | null {
  const value = source[key];
  return typeof value === 'string' && value.trim() ? value : null;
}

function getNumber(source: JsonObject, key: string): number | null {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function getBoolean(source: JsonObject, key: string): boolean | null {
  const value = source[key];
  return typeof value === 'boolean' ? value : null;
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\u0600-\u06ff]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
