/**
 * Script pour supprimer et recréer toutes les tables
 * Usage: node scripts/reset-tables.js
 */

const { DynamoDBClient, DeleteTableCommand, waitUntilTableNotExists } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const awsRegion = process.env.AWS_REGION || 'eu-north-1';
const awsCreds = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }
  : {};

const client = new DynamoDBClient(Object.assign({ region: awsRegion }, awsCreds));

const TABLES = [
  process.env.ARTISTS_TABLE || 'lyricscape-artists-prod',
  process.env.SONGS_TABLE || 'lyricscape-songs-prod',
  process.env.ALBUMS_TABLE || 'lyricscape-albums-prod'
];

async function deleteTable(tableName) {
  try {
    console.log(`🗑️  Deleting table: ${tableName}`);
    const command = new DeleteTableCommand({ TableName: tableName });
    await client.send(command);
    
    console.log(`⏳ Waiting for table ${tableName} to be deleted...`);
    await waitUntilTableNotExists(
      { client, maxWaitTime: 60, minDelay: 2, maxDelay: 5 },
      { TableName: tableName }
    );
    
    console.log(`✅ Table ${tableName} deleted successfully\n`);
  } catch (error) {
    if (error.name === 'ResourceNotFoundException') {
      console.log(`ℹ️  Table ${tableName} does not exist, skipping...\n`);
    } else {
      console.error(`❌ Error deleting table ${tableName}:`, error.message);
    }
  }
}

async function resetTables() {
  console.log('🚀 Starting tables reset...\n');
  
  // Supprimer toutes les tables
  for (const tableName of TABLES) {
    await deleteTable(tableName);
  }
  
  console.log('\n✨ All tables deleted! Now recreating them...\n');
  
  // Recréer les tables
  const { execSync } = require('child_process');
  
  try {
    console.log('📝 Creating Artists table...');
    execSync('node scripts/create-artists-table.js', { stdio: 'inherit' });
    
    console.log('\n📝 Creating Songs table...');
    execSync('node scripts/create-songs-table.js', { stdio: 'inherit' });
    
    console.log('\n📝 Creating Albums table...');
    execSync('node scripts/create-albums-table.js', { stdio: 'inherit' });
    
    console.log('\n\n🎉 All tables have been reset successfully!');
    console.log('\n👉 Next step: Run migration script');
    console.log('   node scripts/migrate-seed-to-dynamodb.js\n');
  } catch (error) {
    console.error('❌ Error creating tables:', error.message);
    process.exit(1);
  }
}

resetTables().catch(err => {
  console.error('💥 Script failed:', err);
  process.exit(1);
});
