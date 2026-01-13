const { DynamoDBClient, CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

require('dotenv').config();

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });
const dynamoClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = 'lyricscape-collab-requests-prod';

async function setupCollabRequestsTable() {
  try {
    // Check if table exists
    try {
      const describeResult = await client.send(
        new DescribeTableCommand({ TableName: TABLE_NAME })
      );
      console.log(`✅ Table "${TABLE_NAME}" already exists`);
      console.log('Table Status:', describeResult.Table.TableStatus);
      return;
    } catch (error) {
      if (error.name !== 'ResourceNotFoundException') {
        throw error;
      }
      // Table doesn't exist, continue to create it
    }

    console.log(`Creating table "${TABLE_NAME}"...`);

    const createTableParams = {
      TableName: TABLE_NAME,
      KeySchema: [
        { AttributeName: 'id', KeyType: 'HASH' } // Primary key
      ],
      AttributeDefinitions: [
        { AttributeName: 'id', AttributeType: 'N' },
        { AttributeName: 'artist_id', AttributeType: 'N' },
        { AttributeName: 'requester_id', AttributeType: 'S' },
        { AttributeName: 'status', AttributeType: 'S' },
        { AttributeName: 'created_at', AttributeType: 'N' }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'artist_id-status-index',
          KeySchema: [
            { AttributeName: 'artist_id', KeyType: 'HASH' },
            { AttributeName: 'status', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: {
            ReadCapacityUnits: 5,
            WriteCapacityUnits: 5
          }
        },
        {
          IndexName: 'requester_id-created_at-index',
          KeySchema: [
            { AttributeName: 'requester_id', KeyType: 'HASH' },
            { AttributeName: 'created_at', KeyType: 'RANGE' }
          ],
          Projection: { ProjectionType: 'ALL' },
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
      }
    };

    await client.send(new CreateTableCommand(createTableParams));

    console.log(`✅ Table "${TABLE_NAME}" created successfully!`);
    console.log('\nWaiting for table to become active...');

    // Wait for table to become active
    let tableActive = false;
    while (!tableActive) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const describeResult = await client.send(
        new DescribeTableCommand({ TableName: TABLE_NAME })
      );
      tableActive = describeResult.Table.TableStatus === 'ACTIVE';
      console.log('Table Status:', describeResult.Table.TableStatus);
    }

    console.log('\n✅ Table is now ACTIVE and ready to use!');
    console.log('\nTable Structure:');
    console.log('- Primary Key: id (Number)');
    console.log('- GSI 1: artist_id-status-index (for artists to view their requests by status)');
    console.log('- GSI 2: requester_id-created_at-index (for users to view their requests chronologically)');
    console.log('\nYou can now use the collaboration requests API!');

  } catch (error) {
    console.error('❌ Error setting up table:', error);
    process.exit(1);
  }
}

// Run the setup
setupCollabRequestsTable();
