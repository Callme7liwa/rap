/**
 * Migration Script: Add collaborator_artist_id and collaborator_artist_name fields
 * 
 * This script adds the new fields to existing collaboration requests:
 * - collaborator_artist_id: null (for backward compatibility)
 * - collaborator_artist_name: null (for backward compatibility)
 */

require('dotenv').config();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');

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

/**
 * Add new fields to all existing requests
 */
async function addCollaboratorFields() {
  console.log('\n🔄 Adding collaborator fields to existing requests...\n');
  
  try {
    // Scan all requests
    console.log('📋 Scanning all collaboration requests...');
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: REQUESTS_TABLE
    }));

    const requests = scanResult.Items || [];
    console.log(`✅ Found ${requests.length} requests to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each request
    for (let i = 0; i < requests.length; i++) {
      const request = requests[i];
      console.log(`\n[${i + 1}/${requests.length}] Processing request ${request.id}`);

      // Check if already has the fields
      if (request.collaborator_artist_id !== undefined) {
        console.log('  ⏭️  Already has collaborator fields, skipping');
        skippedCount++;
        continue;
      }

      try {
        // Add the new fields
        await dynamoClient.send(new UpdateCommand({
          TableName: REQUESTS_TABLE,
          Key: {
            id: request.id
          },
          UpdateExpression: 'SET collaborator_artist_id = :collab_id, collaborator_artist_name = :collab_name',
          ExpressionAttributeValues: {
            ':collab_id': null,
            ':collab_name': null
          }
        }));

        console.log(`  ✅ Added collaborator fields (both set to null)`);
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
    console.log(`✅ Updated:  ${updatedCount} requests`);
    console.log(`⏭️  Skipped:  ${skippedCount} requests (already have fields)`);
    console.log(`✗  Errors:   ${errorCount} requests`);
    console.log(`📝 Total:    ${requests.length} requests`);
    console.log('='.repeat(60));
    console.log('\n✨ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
addCollaboratorFields()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
