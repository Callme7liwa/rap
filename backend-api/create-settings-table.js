const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');

// Initialize DynamoDB client
const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' }));

const TABLE_NAME = 'lyricscape-settings-prod';

async function createSettingsTable() {
  console.log('='.repeat(60));
  console.log('DynamoDB Settings Table Setup');
  console.log('='.repeat(60));
  console.log();

  try {
    // Create the table using AWS SDK v3
    const { CreateTableCommand } = require('@aws-sdk/client-dynamodb');
    const dynamoDbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' });

    console.log(`Creating table: ${TABLE_NAME}`);

    const createTableParams = {
      TableName: TABLE_NAME,
      AttributeDefinitions: [
        {
          AttributeName: 'setting_key',
          AttributeType: 'S'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'setting_key',
          KeyType: 'HASH'
        }
      ],
      BillingMode: 'PAY_PER_REQUEST'
    };

    try {
      const createResponse = await dynamoDbClient.send(new CreateTableCommand(createTableParams));
      console.log(`✓ Table creation initiated: ${TABLE_NAME}`);
      console.log(`  Status: ${createResponse.TableDescription.TableStatus}`);
      console.log('\nWaiting for table to become active...');

      // Wait for table to be active
      await waitForTableActive(dynamoDbClient, TABLE_NAME);
      console.log(`✓ Table ${TABLE_NAME} is now active!`);

    } catch (error) {
      if (error.name === 'ResourceInUseException') {
        console.log(`⚠ Table ${TABLE_NAME} already exists`);
      } else {
        throw error;
      }
    }

    // Insert default setting
    console.log('\nInserting default collab request limit setting...');
    
    // Check if setting already exists
    const getResult = await dynamoClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { setting_key: 'collab_request_limit' }
    }));

    if (getResult.Item) {
      console.log(`✓ Default setting already exists: collab_request_limit = ${getResult.Item.setting_value}`);
    } else {
      await dynamoClient.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          setting_key: 'collab_request_limit',
          setting_value: '2',
          updated_at: Date.now(),
          updated_by: 'system'
        }
      }));
      console.log('✓ Default setting inserted: collab_request_limit = 2');
    }

    console.log('\n✅ Setup complete!');
    console.log('\n' + '='.repeat(60));
    console.log('Next Steps:');
    console.log('='.repeat(60));
    console.log('1. Restart your backend server');
    console.log('2. Login as an admin user');
    console.log('3. Navigate to Admin → Collab Settings');
    console.log('4. Test changing the collaboration request limit');
    
    return true;

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    return false;
  }
}

async function waitForTableActive(client, tableName, maxAttempts = 30) {
  const { DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
  
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await client.send(new DescribeTableCommand({ TableName: tableName }));
      const status = response.Table.TableStatus;
      
      if (status === 'ACTIVE') {
        return true;
      }
      
      // Wait 2 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      if (error.name === 'ResourceNotFoundException') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      throw error;
    }
  }
  
  throw new Error('Table did not become active in time');
}

// Run the setup
createSettingsTable()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
