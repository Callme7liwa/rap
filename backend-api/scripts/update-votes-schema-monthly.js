const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

const client = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const VOTES_TABLE = process.env.VOTES_TABLE || 'lyricscape-votes-prod';

/**
 * Monthly Voting System Schema Update
 * 
 * New Schema:
 * - PK: VOTE#userId#type#period (e.g., VOTE#123#song#2025-11)
 * - SK: ITEM#itemId
 * - voted_at: timestamp
 * - period: "YYYY-MM" format (e.g., "2025-11" for November 2025)
 * 
 * This allows:
 * - Users to vote each month
 * - Historical tracking of votes by period
 * - Query top voted items per month
 */

async function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

async function migrateExistingVotes() {
  console.log('📊 Migrating existing votes to monthly system...\n');
  
  const period = await getCurrentPeriod();
  console.log(`Current period: ${period}\n`);

  try {
    // Scan all existing votes
    const result = await client.send(new ScanCommand({
      TableName: VOTES_TABLE
    }));

    const votes = result.Items || [];
    console.log(`Found ${votes.length} existing votes to migrate\n`);

    if (votes.length === 0) {
      console.log('✅ No votes to migrate');
      return;
    }

    let migrated = 0;
    let skipped = 0;

    for (const vote of votes) {
      // Check if vote already has period
      if (vote.period) {
        skipped++;
        continue;
      }

      // Parse old PK format: VOTE#userId#type
      const pkParts = vote.PK.split('#');
      if (pkParts.length < 3) {
        console.log(`⚠️  Skipping invalid vote: ${vote.PK}`);
        skipped++;
        continue;
      }

      const [, userId, type] = pkParts;
      
      // Create new PK with period
      const newPK = `VOTE#${userId}#${type}#${period}`;

      // Delete old vote
      await client.send(new DeleteCommand({
        TableName: VOTES_TABLE,
        Key: {
          PK: vote.PK,
          SK: vote.SK
        }
      }));

      // Insert with new schema
      await client.send(new PutCommand({
        TableName: VOTES_TABLE,
        Item: {
          ...vote,
          PK: newPK,
          period: period,
          voted_at: vote.voted_at || Date.now()
        }
      }));

      migrated++;
      console.log(`✅ Migrated: ${vote.PK} → ${newPK}`);
    }

    console.log(`\n📊 Migration complete:`);
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📅 All votes now in period: ${period}`);

  } catch (error) {
    console.error('❌ Error migrating votes:', error);
    throw error;
  }
}

async function testNewSchema() {
  console.log('\n🧪 Testing new schema...\n');
  
  const testUserId = 'test-user-123';
  const testPeriod = await getCurrentPeriod();
  const testType = 'song';
  const testItemId = '999';

  try {
    // Test vote insertion
    const testVote = {
      PK: `VOTE#${testUserId}#${testType}#${testPeriod}`,
      SK: `ITEM#${testItemId}`,
      voted_at: Date.now(),
      period: testPeriod
    };

    await client.send(new PutCommand({
      TableName: VOTES_TABLE,
      Item: testVote
    }));

    console.log('✅ Test vote created successfully');
    console.log(`   Period: ${testPeriod}`);
    console.log(`   Format: VOTE#userId#type#period`);

    // Clean up test
    await client.send(new DeleteCommand({
      TableName: VOTES_TABLE,
      Key: {
        PK: testVote.PK,
        SK: testVote.SK
      }
    }));

    console.log('✅ Test vote cleaned up\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

async function main() {
  console.log('🗓️  Monthly Voting System Setup\n');
  console.log('This will migrate existing votes to the new monthly schema.\n');
  console.log('New schema: VOTE#userId#type#period (e.g., VOTE#123#song#2025-11)\n');
  
  await migrateExistingVotes();
  await testNewSchema();
  
  console.log('🎉 Monthly voting system ready!\n');
  console.log('Users can now:');
  console.log('- Vote for items each month');
  console.log('- View historical winners by month');
  console.log('- See current month\'s top voted items\n');
}

main().catch(console.error);
