const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

// Database configuration
const dbConfig = {
  host: 'localhost',
  user: 'root', // Change to your MySQL username
  password: '', // Change to your MySQL password
  database: 'lyricscape', // Change to your database name
  waitForConnections: true,
  connectionLimit: 10
};

async function populateDatabase() {
  let connection;
  try {
    // Read seed data
    console.log('📖 Reading seed data...');
    const seedData = JSON.parse(
      await fs.readFile(path.join(__dirname, '..', '..', 'src', 'data', 'seed.json'), 'utf8')
    );

    // Create connection pool
    connection = await mysql.createConnection(dbConfig);
    await connection.beginTransaction();

    console.log('🔄 Starting data population...');

    // Process each artist
    for (const artist of seedData) {
      // Insert artist
      console.log(`📝 Processing artist: ${artist.name}`);
      
      const artistQuery = `
        INSERT INTO artists (
          id, name, slug, normalized_name, url, image_url, header_image_url,
          is_verified, followers_count, iq, alternate_names, instagram_name,
          twitter_name, facebook_name, has_arabic, likely_moroccan, source_names
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await connection.execute(artistQuery, [
        artist.id,
        artist.name,
        artist.slug,
        artist.normalized_name,
        artist.url,
        artist.image_url,
        artist.header_image_url,
        artist.is_verified,
        artist.followers_count,
        artist.iq,
        JSON.stringify(artist.alternate_names),
        artist.instagram_name,
        artist.twitter_name,
        artist.facebook_name,
        artist.has_arabic,
        artist.likely_moroccan,
        JSON.stringify(artist.source_names)
      ]);

      // Process songs for this artist
      if (Array.isArray(artist.songs)) {
        for (const song of artist.songs) {
          console.log(`  🎵 Processing song: ${song.title}`);

          // Insert song
          const songQuery = `
            INSERT INTO songs (
              id, title, full_title, url, path, release_date,
              release_date_for_display, release_date_components,
              song_art_image_url, lyrics_state, instrumental,
              annotation_count, pyongs_count, pageviews, lyrics
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `;

          let releaseDate = null;
          if (song.release_date_components) {
            const components = JSON.parse(song.release_date_components.replace(/'/g, '"'));
            if (components.year && components.month && components.day) {
              releaseDate = `${components.year}-${String(components.month).padStart(2, '0')}-${String(components.day).padStart(2, '0')}`;
            }
          }

          await connection.execute(songQuery, [
            song.id,
            song.title,
            song.full_title,
            song.url,
            song.path,
            releaseDate,
            song.release_date_for_display,
            song.release_date_components,
            song.song_art_image_url,
            song.lyrics_state,
            song.instrumental || false,
            song.annotation_count,
            song.pyongs_count,
            song.pageviews,
            song.lyrics
          ]);

          // Insert song-artist relationship
          const songArtistQuery = `
            INSERT INTO song_artists (song_id, artist_id, role, artist_role)
            VALUES (?, ?, ?, ?)
          `;

          await connection.execute(songArtistQuery, [
            song.id,
            artist.id,
            song.artist_role || 'primary',
            song.artist_role || 'primary'
          ]);

          // Insert lyrics if present
          if (song.lyrics) {
            const lyricsQuery = `
              INSERT INTO lyrics (song_id, content, language, is_current, source)
              VALUES (?, ?, ?, true, 'GENIUS')
            `;

            await connection.execute(lyricsQuery, [
              song.id,
              song.lyrics,
              'unknown' // You might want to implement language detection here
            ]);
          }

          // Group songs into albums based on release date
          if (song.release_date_components) {
            const components = JSON.parse(song.release_date_components.replace(/'/g, '"'));
            if (components.year && components.month) {
              const albumId = `${artist.id}-${components.year}-${components.month}`;
              
              // Create album if doesn't exist
              const albumQuery = `
                INSERT IGNORE INTO albums (
                  id, title, release_date, album_type, status
                ) VALUES (?, ?, ?, 'single', 'ACTIVE')
              `;

              await connection.execute(albumQuery, [
                albumId,
                `${artist.name} - ${components.year}/${components.month}`,
                releaseDate
              ]);

              // Link song to album
              const albumSongQuery = `
                INSERT IGNORE INTO album_songs (album_id, song_id)
                VALUES (?, ?)
              `;

              await connection.execute(albumSongQuery, [albumId, song.id]);
            }
          }
        }
      }
    }

    await connection.commit();
    console.log('✅ Data population completed successfully!');

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }
    console.error('❌ Error populating database:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the script
console.log('🚀 Starting database population script...');
populateDatabase()
  .then(() => {
    console.log('✨ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });