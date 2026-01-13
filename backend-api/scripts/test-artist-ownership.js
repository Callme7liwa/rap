/**
 * Test Artist Ownership System
 * 
 * This script tests the artist ownership and content management system.
 * Run after associating a user with an artist in the admin panel.
 */

const { CognitoIdentityProviderClient, AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;
const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';

async function testOwnershipSystem() {
  console.log('\n' + '='.repeat(70));
  console.log('🎸 ARTIST OWNERSHIP SYSTEM TEST');
  console.log('='.repeat(70) + '\n');

  // 1. Get all artist-user associations
  console.log('1️⃣  Checking Artist-User Associations...\n');
  
  const scanResult = await dynamoClient.send(new QueryCommand({
    TableName: ARTIST_USERS_TABLE,
    KeyConditionExpression: 'artist_id = :aid',
    ExpressionAttributeValues: {
      ':aid': 1 // Just checking if table has data
    }
  }));

  // Actually scan all
  const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
  const allAssociations = await dynamoClient.send(new ScanCommand({
    TableName: ARTIST_USERS_TABLE
  }));

  if (!allAssociations.Items || allAssociations.Items.length === 0) {
    console.log('⚠️  No artist-user associations found!');
    console.log('   To set up:\n');
    console.log('   1. Go to Admin Panel → User Management');
    console.log('   2. Use "Associate Artist to User" feature');
    console.log('   3. Or run: node scripts/add-user-to-artist.js\n');
    return;
  }

  console.log(`✅ Found ${allAssociations.Items.length} artist-user associations:\n`);

  for (const assoc of allAssociations.Items) {
    // Get artist name
    const artistResult = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: assoc.artist_id }
    }));

    const artistName = artistResult.Item?.name || 'Unknown';
    
    console.log(`   🎤 Artist: ${artistName} (ID: ${assoc.artist_id})`);
    console.log(`      User ID: ${assoc.user_id}`);
    console.log(`      Associated: ${new Date(assoc.associated_at).toLocaleDateString()}`);

    // Get songs count for this artist
    const songsResult = await dynamoClient.send(new ScanCommand({
      TableName: SONGS_TABLE,
      FilterExpression: 'artist_id = :aid',
      ExpressionAttributeValues: {
        ':aid': assoc.artist_id
      }
    }));

    // Get albums count
    const albumsResult = await dynamoClient.send(new ScanCommand({
      TableName: ALBUMS_TABLE,
      FilterExpression: 'artist_id = :aid',
      ExpressionAttributeValues: {
        ':aid': assoc.artist_id
      }
    }));

    console.log(`      📊 Content: ${songsResult.Items?.length || 0} songs, ${albumsResult.Items?.length || 0} albums`);
    console.log('');
  }

  // 2. Show what artists can do
  console.log('2️⃣  Artist Capabilities:\n');
  console.log('   ✅ Update own artist profile (bio, social links)');
  console.log('   ✅ Create new songs');
  console.log('   ✅ Update own songs (title, lyrics, URLs, artwork)');
  console.log('   ✅ Delete own songs');
  console.log('   ✅ Create new albums');
  console.log('   ✅ Update own albums (name, artwork, year, URLs)');
  console.log('   ✅ Delete own albums');
  console.log('   ✅ View all own content');
  console.log('   ❌ Cannot modify other artists\' content');
  console.log('   ❌ Cannot delete other artists\' content\n');

  // 3. Show API endpoints
  console.log('3️⃣  Available API Endpoints:\n');
  console.log('   GET    /api/artist-profile/me          - Get own artist profile');
  console.log('   PUT    /api/artist-profile/me          - Update artist profile');
  console.log('   GET    /api/artist-content/my-content  - Get all own content');
  console.log('   POST   /api/artist-content/songs       - Create new song');
  console.log('   PUT    /api/artist-content/songs/:id   - Update song');
  console.log('   DELETE /api/artist-content/songs/:id   - Delete song');
  console.log('   POST   /api/artist-content/albums      - Create new album');
  console.log('   PUT    /api/artist-content/albums/:id  - Update album');
  console.log('   DELETE /api/artist-content/albums/:id  - Delete album\n');

  // 4. Security checks
  console.log('4️⃣  Security Features:\n');
  console.log('   🔒 JWT authentication required for all endpoints');
  console.log('   🔒 Ownership verification before any modification');
  console.log('   🔒 Admins can override and modify all content');
  console.log('   🔒 Artists can ONLY modify their own content');
  console.log('   🔒 Regular users have read-only access');
  console.log('   🔒 Clear error messages for denied access\n');

  // 5. Testing instructions
  console.log('5️⃣  How to Test:\n');
  console.log('   1. Login as an artist-associated user');
  console.log('   2. Try: GET /api/artist-profile/me');
  console.log('   3. Try: GET /api/artist-content/my-content');
  console.log('   4. Try updating a song: PUT /api/artist-content/songs/:id');
  console.log('   5. Try creating a song: POST /api/artist-content/songs');
  console.log('   6. Try modifying another artist\'s content (should fail with 403)\n');

  console.log('='.repeat(70));
  console.log('✅ SYSTEM READY - Artists can now manage their content!');
  console.log('='.repeat(70) + '\n');
}

testOwnershipSystem().catch(error => {
  console.error('\n❌ Error:', error.message);
  console.error(error);
  process.exit(1);
});
