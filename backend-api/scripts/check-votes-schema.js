const { DynamoDBClient, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({ region: 'eu-north-1' });

async function checkSchema() {
  try {
    const result = await client.send(new DescribeTableCommand({ 
      TableName: 'lyricscape-votes-prod' 
    }));
    
    console.log('Main Table Keys:');
    console.log(JSON.stringify(result.Table.KeySchema, null, 2));
    
    console.log('\nGlobal Secondary Indexes:');
    result.Table.GlobalSecondaryIndexes.forEach(gsi => {
      console.log(`\n${gsi.IndexName}:`);
      console.log(JSON.stringify(gsi.KeySchema, null, 2));
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSchema();
