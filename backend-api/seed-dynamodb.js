// DynamoDB seeder for artists and songs using AWS SDK v3
// - Reads data from src/data/seed.json
// - Writes artists to ARTISTS_TABLE and songs to SONGS_TABLE
// Usage: node seed-dynamodb.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const region = process.env.AWS_REGION || 'eu-north-1';
const client = new DynamoDBClient({ region });
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const SEED_PATH = path.join(__dirname, '../src/data/seed.json');

async function seed() {
  const raw = fs.readFileSync(SEED_PATH, 'utf8');
  const data = JSON.parse(raw);

  let artistCount = 0;
  let songCount = 0;

  for (const artist of data) {
    const { songs = [], ...rest } = artist;

    // Normalize keys: use string IDs for table keys
    const artistItem = {
      ...rest,
      artist_id: String(artist.id),
      id: String(artist.id),
    };

    // Put artist (without songs array on the item)
    delete artistItem.songs;
    await ddb.send(new PutCommand({
      TableName: ARTISTS_TABLE,
      Item: artistItem,
    }));
    artistCount += 1;

    // Put each song augmented with artist info
    for (const song of songs) {
      await ddb.send(new PutCommand({
        TableName: SONGS_TABLE,
        Item: {
          ...song,
          // normalize id fields as strings for consistency
          id: String(song.id),
          song_id: String(song.id),
          artist_id: String(artist.id),
          artist_name: artist.name,
          artist_slug: artist.slug,
        },
      }));
      songCount += 1;
    }
  }

  console.log(`✅ Seed complete. Artists: ${artistCount}, Songs: ${songCount}`);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
