/**
 * Script pour créer la table DynamoDB des artistes
 * Usage: node scripts/create-artists-table.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { CreateTableCommand, DescribeTableCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const awsRegion = process.env.AWS_REGION || 'eu-north-1';
const awsCreds = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }
  : {};

const client = new DynamoDBClient(Object.assign({ region: awsRegion }, awsCreds));

const TABLE_NAME = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';

async function createArtistsTable() {
  console.log(`🎨 Creating Artists table: ${TABLE_NAME}`);

  // Vérifier si la table existe déjà
  try {
    const describeCommand = new DescribeTableCommand({ TableName: TABLE_NAME });
    await client.send(describeCommand);
    console.log(`✅ Table ${TABLE_NAME} already exists`);
    return;
  } catch (error) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }
    // Table n'existe pas, on la crée
  }

  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'id', KeyType: 'HASH' } // Partition key
    ],
    AttributeDefinitions: [
      { AttributeName: 'id', AttributeType: 'N' },
      { AttributeName: 'name', AttributeType: 'S' },
      { AttributeName: 'slug', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'NameIndex',
        KeySchema: [
          { AttributeName: 'name', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      },
      {
        IndexName: 'SlugIndex',
        KeySchema: [
          { AttributeName: 'slug', KeyType: 'HASH' }
        ],
        Projection: { ProjectionType: 'ALL' },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5
        }
      }
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5
    },
    StreamSpecification: {
      StreamEnabled: false
    }
  };

  try {
    const command = new CreateTableCommand(params);
    await client.send(command);
    console.log(`✅ Table ${TABLE_NAME} created successfully!`);
    console.log(`⏳ Waiting for table to become active...`);

    // Attendre que la table soit active
    let tableStatus = 'CREATING';
    while (tableStatus !== 'ACTIVE') {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const describeCommand = new DescribeTableCommand({ TableName: TABLE_NAME });
      const response = await client.send(describeCommand);
      tableStatus = response.Table.TableStatus;
      console.log(`   Status: ${tableStatus}`);
    }

    console.log(`\n🎉 Table ${TABLE_NAME} is now ACTIVE!`);
  } catch (error) {
    console.error(`❌ Error creating table:`, error);
    process.exit(1);
  }
}

createArtistsTable();
