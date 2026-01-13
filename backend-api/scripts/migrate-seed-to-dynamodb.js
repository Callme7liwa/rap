/**
 * Migration Script: seed.json → DynamoDB
 * 
 * Ce script lit le fichier seed.json et migre toutes les données
 * vers les tables DynamoDB appropriées :
 * - Artists → Artists table
 * - Songs → Songs table  
 * - Albums → Albums table
 * 
 * Usage: node scripts/migrate-seed-to-dynamodb.js
 */

const fs = require('fs');
const path = require('path');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

// Configuration AWS
const awsRegion = process.env.AWS_REGION || 'eu-north-1';
const awsCreds = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }
  : {};

const client = new DynamoDBClient(Object.assign({ region: awsRegion }, awsCreds));
const docClient = DynamoDBDocumentClient.from(client);

// Noms des tables (à créer si nécessaire)
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';

/**
 * Batch write avec gestion automatique des lots de 25 items
 */
async function batchWriteItems(tableName, items, itemType = 'items') {
  if (!items || items.length === 0) {
    console.log(`No ${itemType} to write`);
    return;
  }

  const BATCH_SIZE = 25; // Limite DynamoDB
  const DELAY_MS = 1000; // Délai de 1 seconde entre chaque batch
  const MAX_RETRIES = 3;
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    let retries = 0;
    let success = false;
    
    while (retries < MAX_RETRIES && !success) {
      try {
        const command = new BatchWriteCommand({
          RequestItems: {
            [tableName]: batch.map(item => ({
              PutRequest: { Item: item }
            }))
          }
        });

        await docClient.send(command);
        processed += batch.length;
        console.log(`✅ Processed ${processed}/${items.length} ${itemType}`);
        success = true;
        
        // Ajouter un délai pour éviter de dépasser les limites de throughput
        if (i + BATCH_SIZE < items.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }
      } catch (error) {
        retries++;
        
        if (error.name === 'ProvisionedThroughputExceededException' && retries < MAX_RETRIES) {
          const waitTime = 5000 * retries; // Attendre 5s, 10s, 15s...
          console.log(`⏸️  Throttled, waiting ${waitTime/1000}s before retry ${retries}/${MAX_RETRIES}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        } else {
          console.error(`❌ Error writing batch ${i}-${i + batch.length}:`, error.message);
          failed += batch.length;
          break;
        }
      }
    }
  }

  console.log(`\n📊 ${itemType} Summary: ${processed} processed, ${failed} failed\n`);
}

/**
 * Migrer les artistes
 */
async function migrateArtists(seedData) {
  console.log('\n🎨 Migrating Artists...');
  
  const artists = seedData.map(artist => ({
    id: artist.id,
    name: artist.name,
    slug: artist.slug || `artist-${artist.id}`,
    url: artist.url,
    image_url: artist.image_url,
    header_image_url: artist.header_image_url,
    is_verified: artist.is_verified || false,
    followers_count: artist.followers_count || 0,
    iq: artist.iq || 0,
    alternate_names: artist.alternate_names || [],
    description_html: artist.description_html || null,
    description_markdown: artist.description_markdown || null,
    description_preview: artist.description_preview || null,
    instagram_name: artist.instagram_name || null,
    twitter_name: artist.twitter_name || null,
    facebook_name: artist.facebook_name || null,
    normalized_name: artist.normalized_name || artist.name.toLowerCase(),
    name_tokens: artist.name_tokens || [artist.name.toLowerCase()],
    has_arabic: artist.has_arabic || false,
    likely_moroccan: artist.likely_moroccan || false,
    source_names: artist.source_names || [],
    songs_count: artist.songs ? artist.songs.length : 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }));

  await batchWriteItems(ARTISTS_TABLE, artists, 'artists');
  return artists.length;
}

/**
 * Migrer les chansons
 */
async function migrateSongs(seedData) {
  console.log('\n🎵 Migrating Songs...');
  
  const allSongs = [];
  
  seedData.forEach(artist => {
    if (artist.songs && Array.isArray(artist.songs)) {
      artist.songs.forEach(song => {
        allSongs.push({
          id: song.id,
          title: song.title,
          full_title: song.full_title,
          url: song.url,
          path: song.path || '',
          release_date_for_display: song.release_date_for_display,
          release_date_components: typeof song.release_date_components === 'string' 
            ? song.release_date_components 
            : JSON.stringify(song.release_date_components || {}),
          song_art_image_url: song.song_art_image_url,
          lyrics_state: song.lyrics_state || 'complete',
          instrumental: song.instrumental || false,
          annotation_count: song.annotation_count || 0,
          pyongs_count: song.pyongs_count || 0,
          pageviews: song.pageviews || 0,
          updated_by_human_at: song.updated_by_human_at || Math.floor(Date.now() / 1000),
          primary_artist_id: song.primary_artist_id,
          primary_artist_name: song.primary_artist_name,
          primary_artist_slug: song.primary_artist_slug || null,
          album_id: song.album_id || null,
          album_name: song.album_name || null,
          lyrics: song.lyrics || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    }
  });

  await batchWriteItems(SONGS_TABLE, allSongs, 'songs');
  return allSongs.length;
}

/**
 * Migrer les albums
 */
async function migrateAlbums(seedData) {
  console.log('\n💿 Migrating Albums...');
  
  const allAlbums = [];
  
  seedData.forEach(artist => {
    if (artist.albums && Array.isArray(artist.albums)) {
      artist.albums.forEach(album => {
        allAlbums.push({
          id: album.id,
          name: album.name,
          full_title: album.full_title,
          url: album.url,
          cover_art_url: album.cover_art_url,
          release_date_for_display: album.release_date_for_display,
          release_date_components: typeof album.release_date_components === 'string'
            ? album.release_date_components
            : JSON.stringify(album.release_date_components || {}),
          artist_id: album.artist_id,
          artist_name: album.artist_name,
          songs: album.songs || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      });
    }
  });

  await batchWriteItems(ALBUMS_TABLE, allAlbums, 'albums');
  return allAlbums.length;
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting seed.json → DynamoDB migration\n');
  console.log(`📍 Region: ${awsRegion}`);
  console.log(`📦 Tables:`);
  console.log(`   - Artists: ${ARTISTS_TABLE}`);
  console.log(`   - Songs: ${SONGS_TABLE}`);
  console.log(`   - Albums: ${ALBUMS_TABLE}\n`);

  try {
    // Lire le fichier seed.json
    const seedPath = path.join(__dirname, '../../src/data/seed.json');
    console.log(`📖 Reading seed data from: ${seedPath}`);
    
    if (!fs.existsSync(seedPath)) {
      throw new Error(`seed.json not found at ${seedPath}`);
    }

    const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    console.log(`✅ Loaded ${seedData.length} artists from seed.json\n`);

    // Migrer chaque type de données
    const stats = {
      artists: await migrateArtists(seedData),
      songs: await migrateSongs(seedData),
      albums: await migrateAlbums(seedData)
    };

    console.log('\n✨ Migration completed successfully!\n');
    console.log('📊 Final Statistics:');
    console.log(`   - Artists: ${stats.artists}`);
    console.log(`   - Songs: ${stats.songs}`);
    console.log(`   - Albums: ${stats.albums}`);
    console.log(`\n🎉 Total items migrated: ${stats.artists + stats.songs + stats.albums}`);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Vérifier les variables d'environnement
const requiredEnv = ['AWS_REGION'];
const missing = requiredEnv.filter(k => !process.env[k]);

if (missing.length > 0) {
  console.error('❌ Missing required environment variables:', missing.join(', '));
  console.error('Please create backend-api/.env with the necessary AWS credentials');
  process.exit(1);
}

// Exécuter la migration
migrate();
