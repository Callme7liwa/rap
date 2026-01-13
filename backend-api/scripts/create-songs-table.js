const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const awsRegion = process.env.AWS_REGION || 'eu-north-1';
const awsCreds = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }
  : {};

const client = new DynamoDBClient(Object.assign({ region: awsRegion }, awsCreds));

const TABLE_NAME = process.env.SONGS_TABLE || 'lyricscape-songs-prod';

async function createSongsTable() {
  try {
    // Check if table already exists
    try {
      await client.send(new DescribeTableCommand({ TableName: TABLE_NAME }));
      console.log(`✅ Table ${TABLE_NAME} already exists`);
      return;
    } catch (err) {
      if (err.name !== 'ResourceNotFoundException') throw err;
    }

    console.log(`📝 Creating table ${TABLE_NAME}...`);

    const cmd = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' }, // Song ID
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'N' },
        { AttributeName: 'primary_artist_id', AttributeType: 'N' },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'ArtistIdIndex',
          KeySchema: [
            { AttributeName: 'primary_artist_id', KeyType: 'HASH' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      Tags: [
        { Key: 'Environment', Value: 'production' },
        { Key: 'Application', Value: 'lyricscape' },
        { Key: 'Purpose', Value: 'songs' },
      ],
    });

    await client.send(cmd);
    console.log('⏳ Waiting for table to be created...');
    await waitUntilTableExists(
      { client, maxWaitTime: 60, minDelay: 2, maxDelay: 5 },
      { TableName: TABLE_NAME }
    );
    console.log(`✅ Table ${TABLE_NAME} created successfully!`);
  } catch (error) {
    console.error('❌ Error creating songs table:', error);
    process.exit(1);
  }
}

createSongsTable()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n💥 Script failed:', err);
    process.exit(1);
  });
