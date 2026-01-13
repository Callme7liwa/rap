/**
 * Check song ownership for debugging
 * Usage: node scripts/check-song-ownership.js <song_id>
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const SONGS_TABLE = 'lyricscape-songs-prod';
const ARTISTS_TABLE = 'lyricscape-artists-prod';
const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';

async function checkSongOwnership(songId) {
  try {
    console.log(`\n🔍 Checking ownership for Song ID: ${songId}\n`);

    // Get song details
    const songResult = await dynamoClient.send(new GetCommand({
      TableName: SONGS_TABLE,
      Key: { id: parseInt(songId) }
    }));

    if (!songResult.Item) {
      console.log('❌ Song not found');
      return;
    }

    const song = songResult.Item;
    console.log('📀 Song Details:');
    console.log(`   Title: ${song.title}`);
    console.log(`   ID: ${song.id}`);
    console.log(`   Primary Artist ID: ${song.primary_artist_id}`);
    console.log(`   Primary Artist Name: ${song.primary_artist_name}`);
    
    if (song.artist_id && song.artist_id !== song.primary_artist_id) {
      console.log(`   ⚠️  Also has artist_id: ${song.artist_id} (different from primary_artist_id)`);
    }

    // Get artist details
    const artistId = song.primary_artist_id || song.artist_id;
    const artistResult = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: artistId }
    }));

    if (artistResult.Item) {
      console.log(`\n🎤 Artist Details:`);
      console.log(`   Name: ${artistResult.Item.name}`);
      console.log(`   ID: ${artistResult.Item.id}`);
    }

    // Check if this artist is associated with any user
    const associationsResult = await dynamoClient.send(new QueryCommand({
      TableName: ARTIST_USERS_TABLE,
      KeyConditionExpression: 'artist_id = :aid',
      ExpressionAttributeValues: {
        ':aid': artistId
      }
    }));

    if (associationsResult.Items && associationsResult.Items.length > 0) {
      console.log(`\n👤 User Associations:`);
      associationsResult.Items.forEach(assoc => {
        console.log(`   User ID: ${assoc.user_id}`);
        console.log(`   Associated At: ${new Date(assoc.associated_at).toISOString()}`);
      });
      console.log(`\n✅ This song CAN be edited by the associated user(s) above`);
    } else {
      console.log(`\n❌ No users associated with artist ID ${artistId}`);
      console.log(`   This song cannot be edited by any non-admin user`);
      console.log(`   An admin needs to associate a user with this artist first`);
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

// Get song ID from command line args
const songId = process.argv[2];

if (!songId) {
  console.log('Usage: node scripts/check-song-ownership.js <song_id>');
  console.log('Example: node scripts/check-song-ownership.js 2377636');
  process.exit(1);
}

checkSongOwnership(songId).then(() => {
  console.log('\n✅ Done\n');
  process.exit(0);
});
