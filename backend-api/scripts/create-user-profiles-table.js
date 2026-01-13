const { DynamoDBClient, CreateTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'eu-north-1' });

async function createUserProfilesTable() {
  const tableName = 'lyricscape-user-profiles-prod';

  try {
    // Create user profiles table
    const command = {
      TableName: tableName,
      KeySchema: [
        { AttributeName: 'user_id', KeyType: 'HASH' }, // Partition key
      ],
      AttributeDefinitions: [
        { AttributeName: 'user_id', AttributeType: 'S' },
      ],
      BillingMode: 'PAY_PER_REQUEST', // On-demand pricing
    };

    await client.send(new CreateTableCommand(command));

    console.log(`✅ Table ${tableName} created successfully!`);
    console.log(`
Table Schema:
- Primary Key: user_id (String) - Cognito user ID
- Attributes (dynamically added):
  - display_name (String) - User's display name
  - profile_picture (String) - URL to profile picture
  - bio (String) - User bio/description
  - created_at (Number) - Timestamp
  - updated_at (Number) - Timestamp

Note: DynamoDB is schemaless, so attributes are added when data is inserted.
    `);
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log(`⚠️  Table ${tableName} already exists`);
    } else {
      console.error('❌ Error creating table:', error);
      throw error;
    }
  }
}

// Run the script
createUserProfilesTable()
  .then(() => {
    console.log('\n✅ User profiles table setup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });
