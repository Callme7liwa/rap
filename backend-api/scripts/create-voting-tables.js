// backend-api/scripts/create-voting-tables.js
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });

async function createVotingTable() {
  const tableName = 'lyricscape-votes-prod';
  
  console.log(`🔍 Checking if table ${tableName} exists...`);
  
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`✅ Table ${tableName} already exists`);
    return;
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }
    console.log(`📝 Table ${tableName} does not exist, creating...`);
  }

  const params = {
    TableName: tableName,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },  // POLL#<category>#<period> or VOTE#<userId>#<pollId>
      { AttributeName: 'SK', KeyType: 'RANGE' }, // METADATA or NOMINEE#<itemId> or TIMESTAMP
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // For querying by item (song/album/artist)
      { AttributeName: 'GSI1SK', AttributeType: 'S' },
      { AttributeName: 'GSI2PK', AttributeType: 'S' }, // For querying user's votes
      { AttributeName: 'GSI2SK', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ItemIndex',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' }, // ITEM#<type>#<id>
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' }, // POLL#<category>#<period>
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
      {
        IndexName: 'UserVotesIndex',
        KeySchema: [
          { AttributeName: 'GSI2PK', KeyType: 'HASH' }, // USER#<userId>
          { AttributeName: 'GSI2SK', KeyType: 'RANGE' }, // VOTE#<timestamp>
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
      },
    ],
    BillingMode: 'PROVISIONED',
    ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
    StreamSpecification: {
      StreamEnabled: true,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
  };

  try {
    await client.send(new CreateTableCommand(params));
    console.log(`⏳ Waiting for table ${tableName} to be active...`);
    
    await waitUntilTableExists({ client, maxWaitTime: 60 }, { TableName: tableName });
    console.log(`✅ Table ${tableName} created successfully!`);
  } catch (error) {
    console.error(`❌ Error creating table ${tableName}:`, error.message);
    throw error;
  }
}

async function main() {
  try {
    await createVotingTable();
    console.log('\n✅ Voting tables created successfully!');
    console.log('\n📝 Table structure:');
    console.log('   PK: POLL#<category>#<period> | VOTE#<userId>#<pollId>');
    console.log('   SK: METADATA | NOMINEE#<itemId> | <timestamp>');
    console.log('   GSI1: ItemIndex - Query votes by song/album/artist');
    console.log('   GSI2: UserVotesIndex - Query user\'s voting history');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
