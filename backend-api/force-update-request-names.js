/**
 * Force Update Script: Re-fetch display names for ALL requests
 * 
 * This script re-fetches display names even for already migrated requests
 * Useful when users update their display names after creating requests
 */

require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  }
});

const dynamoClient = DynamoDBDocumentClient.from(client);

const REQUESTS_TABLE = 'lyricscape-collab-requests-prod';
const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';
const ARTISTS_TABLE = 'lyricscape-artists-prod';
const USER_PROFILES_TABLE = 'lyricscape-user-profiles-prod';

/**
 * Get user display information
 */
async function getUserDisplayInfo(userId) {
  try {
    console.log(`  → Looking up display info for user: ${userId}`);

    // 1. Check if user is associated with an artist
    const artistAssocResult = await dynamoClient.send(new ScanCommand({
      TableName: ARTIST_USERS_TABLE,
      FilterExpression: 'user_id = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }));

    if (artistAssocResult.Items && artistAssocResult.Items.length > 0) {
      const artistId = artistAssocResult.Items[0].artist_id;
      console.log(`  → User is associated with artist ID: ${artistId}`);
      
      // Get artist name
      const artistResult = await dynamoClient.send(new GetCommand({
        TableName: ARTISTS_TABLE,
        Key: { id: artistId }
      }));

      if (artistResult.Item) {
        console.log(`  → Found artist name: ${artistResult.Item.name}`);
        return {
          displayName: artistResult.Item.name,
          isArtist: true,
          artistId: artistId
        };
      }
    }

    // 2. Check user profile for display_name
    console.log(`  → Checking user profile table`);
    const userProfileResult = await dynamoClient.send(new GetCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: userId }
    }));

    if (userProfileResult.Item && userProfileResult.Item.display_name) {
      console.log(`  → Found user display name: ${userProfileResult.Item.display_name}`);
      return {
        displayName: userProfileResult.Item.display_name,
        isArtist: false,
        artistId: null
      };
    }

    console.log(`  → No display info found, will keep existing name`);
    return {
      displayName: null,
      isArtist: false,
      artistId: null
    };
  } catch (error) {
    console.error('  ✗ Error getting user display info:', error.message);
    return {
      displayName: null,
      isArtist: false,
      artistId: null
    };
  }
}

/**
 * Force update all collaboration requests
 */
async function forceUpdateRequests() {
  console.log('\n🔄 Force updating ALL collaboration requests...\n');
  
  try {
    // Scan all requests
    console.log('📋 Scanning all collaboration requests...');
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: REQUESTS_TABLE
    }));

    const requests = scanResult.Items || [];
    console.log(`✅ Found ${requests.length} requests to process\n`);

    let updatedCount = 0;
    let unchangedCount = 0;
    let errorCount = 0;

    // Process each request
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      console.log(`\n[${i + 1}/${requests.length}] Processing request ${request.id}`);
      console.log(`  Current name: ${request.requester_name}`);
      console.log(`  Requester ID: ${request.requester_id}`);

      try {
        // Get proper display info
        const displayInfo = await getUserDisplayInfo(request.requester_id);
        
        // Use new display name if found, otherwise keep existing
        const newName = displayInfo.displayName || request.requester_name;
        
        // Check if anything changed
        if (newName === request.requester_name && 
            displayInfo.isArtist === request.requester_is_artist &&
            displayInfo.artistId === request.requester_artist_id) {
          console.log(`  ⏭️  No changes needed`);
          unchangedCount++;
          continue;
        }
        
        // Update the request
        await dynamoClient.send(new UpdateCommand({
          TableName: REQUESTS_TABLE,
          Key: {
            id: request.id
          },
          UpdateExpression: 'SET requester_name = :name, requester_is_artist = :isArtist, requester_artist_id = :artistId',
          ExpressionAttributeValues: {
            ':name': newName,
            ':isArtist': displayInfo.isArtist,
            ':artistId': displayInfo.artistId
          }
        }));

        console.log(`  ✅ Updated to: ${newName} ${displayInfo.isArtist ? '(Artist)' : '(User)'}`);
        updatedCount++;
      } catch (error) {
        console.error(`  ✗ Error updating request: ${error.message}`);
        errorCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(60));
    console.log(`✅ Updated:   ${updatedCount} requests`);
    console.log(`⏭️  Unchanged: ${unchangedCount} requests`);
    console.log(`✗  Errors:    ${errorCount} requests`);
    console.log(`📝 Total:     ${requests.length} requests`);
    console.log('='.repeat(60));
    console.log('\n✨ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
forceUpdateRequests()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
