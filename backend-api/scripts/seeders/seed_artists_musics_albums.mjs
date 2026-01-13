// seed_dynamo.mjs
// Simple, readable loader for artists -> songs, albums in DynamoDB (AWS SDK v3)

import { readFile } from "node:fs/promises";
import {
  DynamoDBClient,
  BatchWriteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

/* ----------------------- CONFIG (EDIT IF NEEDED) ----------------------- */
// DynamoDB table names
const TABLES = {
  artists: "lyricscape-artists-prod",
  songs:   "lyricscape-songs-prod",
  albums:  "lyricscape-albums-prod",
};

// Partition key names (per table). Change if your schema differs.
const KEYS = {
  artists: { pk: "id" },
  songs:   { pk: "id" },
  albums:  { pk: "id" },
};

// Default AWS region
const DEFAULT_REGION = "eu-north-1";

/* ----------------------- CLI ARGS ----------------------- */
// Usage examples:
//   node seed_dynamo.mjs                # dry-run
//   node seed_dynamo.mjs --apply        # actually write
//   node seed_dynamo.mjs --region eu-north-1 --file seed.json --apply
function parseArgs(argv = process.argv.slice(2)) {
  const out = { apply: false, file: "seed.json", region: DEFAULT_REGION };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === "--apply") out.apply = true;
    else if (k === "--file")   (out.file = v, i++);
    else if (k === "--region") (out.region = v, i++);
    else if (k === "--artists") (TABLES.artists = v, i++);
    else if (k === "--songs")   (TABLES.songs = v, i++);
    else if (k === "--albums")  (TABLES.albums = v, i++);
  }
  return out;
}

/* ----------------------- UTILITIES ----------------------- */
function nowIso() {
  return new Date().toISOString();
}

// DynamoDB can write max 25 items per BatchWrite
function chunk25(arr) {
  const out = [];
  for (let i = 0; i < arr.length; i += 25) out.push(arr.slice(i, i + 25));
  return out;
}

// JSON inside string? try to parse, else return as-is.
function parseMaybeJsonString(val) {
  if (typeof val !== "string") return val;
  try { return JSON.parse(val); } catch { return val; }
}

/* ----------------------- MAPPERS ----------------------- */
// Flatten an artist row (drop heavy nested arrays; add counts, timestamps)
function mapArtist(artist) {
  const a = { ...artist };
  a.entity_type = "artist";
  a.created_at = a.created_at ?? nowIso();
  a.songs_count  = a.songs_count  ?? (Array.isArray(a.songs)  ? a.songs.length  : 0);
  a.albums_count = a.albums_count ?? (Array.isArray(a.albums) ? a.albums.length : 0);
  delete a.songs;
  delete a.albums;
  return a;
}

// Normalize song row (attach artist info; parse date components if string)
function mapSong(song, artist) {
  const s = { ...song };
  s.entity_type = "song";
  s.artist_id = artist.id ?? artist.artist_id;
  s.artist_name = artist.name;
  if ("release_date_components" in s) {
    s.release_date_components = parseMaybeJsonString(s.release_date_components);
  }
  s.created_at = s.created_at ?? nowIso();
  return s;
}

// Normalize album row (keep song list light so item isn’t huge)
function mapAlbum(album, artist) {
  const al = { ...album };
  al.entity_type = "album";
  al.artist_id = artist.id ?? artist.artist_id;
  al.artist_name = artist.name;
  if ("release_date_components" in al) {
    al.release_date_components = parseMaybeJsonString(al.release_date_components);
  }
  if (Array.isArray(al.songs)) {
    al.songs = al.songs.map(s => ({ id: s.id, title: s.title })).filter(s => s.id || s.title);
  }
  al.created_at = al.created_at ?? nowIso();
  return al;
}

/* ----------------------- BATCH WRITE WITH RETRIES ----------------------- */
async function batchWriteAll(ddb, tableName, items) {
  if (!items.length) return;

  const batches = chunk25(items);
  for (let i = 0; i < batches.length; i++) {
    let unprocessed = batches[i].map(item => ({
      PutRequest: { Item: marshall(item, { removeUndefinedValues: true }) }
    }));

    // Basic retry with exponential backoff on UnprocessedItems
    let attempt = 0;
    while (unprocessed.length) {
      const res = await ddb.send(new BatchWriteItemCommand({
        RequestItems: { [tableName]: unprocessed }
      }));

      const next = res.UnprocessedItems?.[tableName] ?? [];
      if (!next.length) break;

      attempt++;
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), 8000);
      await new Promise(r => setTimeout(r, delayMs));
      unprocessed = next; // retry remaining
    }
    console.log(`✔ Wrote batch ${i + 1}/${batches.length} to ${tableName}`);
  }
}

/* ----------------------- MAIN ----------------------- */
async function main() {
  const args = parseArgs();
  const ddb = new DynamoDBClient({ region: args.region });

  // 1) Load seed.json
  const raw = await readFile(args.file, "utf8");
  const artists = JSON.parse(raw);
  if (!Array.isArray(artists)) {
    throw new Error("seed.json must be a JSON array of artist objects.");
  }

  // 2) Build items for each table
  const artistItems = [];
  const songItems = [];
  const albumItems = [];

  for (const artist of artists) {
    // Artist row
    const A = mapArtist(artist);
    if (A[KEYS.artists.pk] == null) A[KEYS.artists.pk] = artist.id ?? artist.artist_id;
    artistItems.push(A);

    // Songs
    if (Array.isArray(artist.songs)) {
      for (const s of artist.songs) {
        const S = mapSong(s, artist);
        if (S[KEYS.songs.pk] == null) S[KEYS.songs.pk] = S.id ?? S.song_id;
        songItems.push(S);
      }
    }

    // Albums
    if (Array.isArray(artist.albums)) {
      for (const al of artist.albums) {
        const AL = mapAlbum(al, artist);
        if (AL[KEYS.albums.pk] == null) AL[KEYS.albums.pk] = AL.id ?? AL.album_id;
        albumItems.push(AL);
      }
    }
  }

  // 3) Dry-run summary
  console.log("-------------------------------------------------");
  console.log("[dry-run] Prepared:");
  console.log(`  artists: ${artistItems.length}`);
  console.log(`  songs  : ${songItems.length}`);
  console.log(`  albums : ${albumItems.length}`);
  console.log("-------------------------------------------------");

  if (!args.apply) {
    console.log("Nothing written. Add --apply to actually write to DynamoDB.");
    return;
  }

  // 4) Write to DynamoDB
  console.log(`Writing to region ${args.region} ...`);
  await batchWriteAll(ddb, TABLES.artists, artistItems);
  await batchWriteAll(ddb, TABLES.songs,   songItems);
  await batchWriteAll(ddb, TABLES.albums,  albumItems);
  console.log("✅ Done.");
}

main().catch(err => {
  console.error("ERROR:", err?.message || err);
  process.exit(1);
});
