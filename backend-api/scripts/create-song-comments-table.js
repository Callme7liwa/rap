const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists 
} = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'eu-north-1' 
});

const TABLE_NAME = 'lyricscape-song-comments-prod';

async function createSongCommentsTable() {
  try {
    // Check if table already exists
    try {
      const describeCommand = new DescribeTableCommand({ TableName: TABLE_NAME });
      await client.send(describeCommand);
      console.log(`✅ Table ${TABLE_NAME} already exists`);
      return;
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
      // Table doesn't exist, proceed with creation
    }

    console.log(`📝 Creating table ${TABLE_NAME}...`);

    const createTableCommand = new CreateTableCommand({
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'comment_id', KeyType: 'HASH' },  // Partition key
        { AttributeName: 'created_at', KeyType: 'RANGE' }  // Sort key
      ],
      AttributeDefinitions: [
        { AttributeName: 'comment_id', AttributeType: 'S' },
        { AttributeName: 'created_at', AttributeType: 'N' },
        { AttributeName: 'song_id', AttributeType: 'S' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'SongIdIndex',
          KeySchema: [
            { AttributeName: 'song_id', KeyType: 'HASH' },
            { AttributeName: 'created_at', KeyType: 'RANGE' }
          ],
          Projection: {
            ProjectionType: 'ALL'
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        }
      ],
      BillingMode: 'PROVISIONED',
      ProvisionedThroughput: {
        ReadCapacityUnits: 5,
        WriteCapacityUnits: 5
      },
      Tags: [
        { Key: 'Environment', Value: 'production' },
        { Key: 'Application', Value: 'lyricscape' },
        { Key: 'Purpose', Value: 'song-comments' }
      ]
    });

    await client.send(createTableCommand);
    
    console.log('⏳ Waiting for table to be created...');
    await waitUntilTableExists(
      { client, maxWaitTime: 60, minDelay: 2, maxDelay: 5 },
      { TableName: TABLE_NAME }
    );

    console.log(`✅ Table ${TABLE_NAME} created successfully!`);
    console.log(`
📋 Table Structure:
  - Primary Key: comment_id (String)
  - Sort Key: created_at (Number - timestamp)
  - GSI: SongIdIndex (song_id + created_at)
  
  Fields:
    • comment_id: Unique comment identifier
    • song_id: Song ID (for querying)
    • user_id: User ID from Cognito
    • user_name: Display name from user profile
    • user_picture: Profile picture URL
    • content: Comment text
    • created_at: Timestamp
    • updated_at: Timestamp
    • likes: Number of likes
    `);
  } catch (error) {
    console.error('❌ Error creating table:', error);
    throw error;
  }
}

// Run the script
createSongCommentsTable()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
