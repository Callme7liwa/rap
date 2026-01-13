const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const path = require('path');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1',
});

const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true, // Remove undefined values
    convertEmptyValues: true,    // Convert empty strings to null
  }
});

const TABLE_NAME = 'lyricscape-albums-prod';

async function seedAlbumsTable() {
  try {
    // Read seed data
    const seedFile = await fs.readFile(path.join(__dirname, '..', '..', 'src', 'data', 'seed.json'), 'utf8');
    let data;
    try {
      data = JSON.parse(seedFile);
    } catch (err) {
      throw new Error('Failed to parse seed.json: ' + err.message);
    }

    // Extract and transform album data from songs
    const albumsMap = new Map();

    if (!Array.isArray(data)) {
      throw new Error('Invalid seed data: expected an array');
    }

    data.forEach(artist => {
      if (!artist || !artist.songs || !Array.isArray(artist.songs)) {
        console.log('Skipping invalid artist data');
        return;
      }

      artist.songs.forEach(song => {
        let components;
        try {
          if (!song.release_date_components) return;
          components = JSON.parse(song.release_date_components.replace(/'/g, '"'));
          if (!components || typeof components !== 'object') return;
          if (!components.year || !components.month) return;
        } catch (err) {
          console.log(`Skipping song ${song.title} - Invalid release date format`);
          return;
        }

        // Group songs by year and month to create albums
        const albumKey = `${artist.id}-${components.year}-${components.month}`;
        
        if (!albumsMap.has(albumKey)) {
          const releaseDate = new Date(
            components.year,
            components.month - 1,
            components.day || 1
          );
          
          const album_id = `${artist.id}-${components.year}-${components.month}`;
          const timestamp = new Date().toISOString();
          const artistName = artist.name || 'Unknown Artist';
          const releaseMonth = String(components.month).padStart(2, '0');
          const releaseYear = String(components.year);
          
          albumsMap.set(albumKey, {
            entity_type: 'ALBUM',
            album_id: album_id,
            artist_id: Number(artist.id),
            PK: `ARTIST#${artist.id}`,
            SK: `ALBUM#${album_id}`,
            GSI1PK: 'ALL_ALBUMS',
            GSI1SK: `${Math.floor(releaseDate.getTime() / 1000)}#${album_id}`,
            title: `${artistName} - ${releaseYear}/${releaseMonth}`,
            full_title: `${artistName} Collection - ${releaseYear}/${releaseMonth}`,
            description: `Collection of songs by ${artistName} released in ${releaseYear}/${releaseMonth}`,
            release_date: `${releaseYear}-${releaseMonth}-${String(components.day || 1).padStart(2, '0')}`,
            release_date_epoch: Math.floor(releaseDate.getTime() / 1000),
            art_url: song.song_art_image_url || '',
            songs_count: 0,
            songs: [],
            year_month: `${releaseYear}-${releaseMonth}`,
            primary_artist: {
              id: Number(artist.id),
              name: artistName,
              url: artist.url || '',
              image_url: artist.image_url || song.song_art_image_url || ''
            },
            status: 'ACTIVE',
            meta: {
              source: 'GENIUS',
              updated_by: 'SYSTEM',
              version: '1.0'
            },
            created_at: timestamp,
            updated_at: timestamp
          });
        }

        // Add song to album with enhanced metadata and data validation
        const album = albumsMap.get(albumKey);
        const songData = {
          id: Number(song.id),
          title: song.title || 'Untitled',
          full_title: song.full_title || song.title || 'Untitled',
          title_with_featured: song.title_with_featured || song.title || 'Untitled',
          art_url: song.song_art_image_url || '',
          header_image_url: song.header_image_url || '',
          release_date: song.release_date_for_display || album.release_date,
          url: song.url || '',
          lyrics_state: song.lyrics_state || 'complete'
        };

        // Remove any undefined or null values
        Object.keys(songData).forEach(key => {
          if (songData[key] === undefined || songData[key] === null) {
            delete songData[key];
          }
        });

        album.songs.push(songData);
        album.songs_count = album.songs.length;
      });
    });

    // Convert map to array
    const albums = Array.from(albumsMap.values());
    
    if (albums.length === 0) {
      console.log('⚠️ No valid albums found to seed');
      return;
    }

    console.log(`📝 Found ${albums.length} albums to seed`);

    // Seed albums to DynamoDB
    for (const album of albums) {
      try {
        const params = {
          TableName: TABLE_NAME,
          Item: album
        };

        await docClient.send(new PutCommand(params));
        console.log(`✅ Seeded album: ${album.title}`);
      } catch (err) {
        console.error(`❌ Failed to seed album ${album.title}:`, err.message);
      }
    }

    console.log(`\n✨ Successfully seeded ${albums.length} albums`);
  } catch (error) {
    console.error('❌ Error seeding albums:', error);
    process.exit(1);
  }
}

seedAlbumsTable()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Script failed:', err);
    process.exit(1);
  });