/**
 * Migration Script: Add linked_request_id field to existing collaboration requests
 * 
 * This script adds the linked_request_id field with a null value to all existing
 * collaboration requests in the CollabRequests table.
 * 
 * Usage: node add-linked-request-field.js
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  DynamoDBDocumentClient, 
  ScanCommand, 
  UpdateCommand 
} from '@aws-sdk/lib-dynamodb';
import dotenv from 'dotenv';

dotenv.config();

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });
const dynamoClient = DynamoDBDocumentClient.from(client);
const COLLAB_REQUESTS_TABLE = 'CollabRequests';

async function migrateRequests() {
  console.log('🔄 Starting migration: Adding linked_request_id field...\n');

  try {
    // 1. Scan all collaboration requests
    console.log('📊 Scanning all collaboration requests...');
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: COLLAB_REQUESTS_TABLE
    }));

    const requests = scanResult.Items || [];
    console.log(`✅ Found ${requests.length} requests\n`);

    if (requests.length === 0) {
      console.log('ℹ️  No requests to migrate');
      return;
    }

    // 2. Update each request to add linked_request_id field
    let updated = 0;
    let skipped = 0;

    for (const request of requests) {
      // Skip if already has linked_request_id field
      if ('linked_request_id' in request) {
        console.log(`⏭️  Request #${request.id} already has linked_request_id field`);
        skipped++;
        continue;
      }

      try {
        await dynamoClient.send(new UpdateCommand({
          TableName: COLLAB_REQUESTS_TABLE,
          Key: { id: request.id },
          UpdateExpression: 'SET linked_request_id = :null',
          ExpressionAttributeValues: {
            ':null': null
          }
        }));

        updated++;
        console.log(`✅ Updated request #${request.id}`);
      } catch (error) {
        console.error(`❌ Failed to update request #${request.id}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log(`   Total requests: ${requests.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   Skipped: ${skipped}`);
    console.log('='.repeat(50));
    console.log('\n✅ Migration completed successfully!');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migrateRequests()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
