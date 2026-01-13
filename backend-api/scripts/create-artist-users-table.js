const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { CreateTableCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'eu-north-1' 
});

const TABLE_NAME = 'lyricscape-artist-users-prod';

async function createTable() {
  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'artist_id', KeyType: 'HASH' },  // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'artist_id', AttributeType: 'N' },
      { AttributeName: 'user_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIdIndex',
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL'
        }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST',
    Tags: [
      { Key: 'Environment', Value: 'production' },
      { Key: 'Project', Value: 'lyricscape' }
    ]
  };

  try {
    console.log(`Creating table ${TABLE_NAME}...`);
    const data = await client.send(new CreateTableCommand(params));
    console.log('✅ Table created successfully!');
    console.log('Table ARN:', data.TableDescription.TableArn);
    console.log('\nTable schema:');
    console.log('- artist_id (Number): Primary key - Links to artist ID');
    console.log('- user_id (String): Cognito user ID (sub) - GSI for reverse lookup');
    console.log('- email (String): User email');
    console.log('- associated_at (Number): Timestamp when association was created');
    console.log('- associated_by (String): Admin user ID who created the association');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('⚠️  Table already exists');
    } else {
      console.error('Error creating table:', error);
    }
  }
}

createTable();
