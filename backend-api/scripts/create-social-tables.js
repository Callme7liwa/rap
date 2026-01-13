const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { CreateTableCommand } = require('@aws-sdk/client-dynamodb');
require('dotenv').config();

const client = new DynamoDBClient({ 
  region: process.env.AWS_REGION || 'eu-north-1' 
});

/**
 * Social Features Tables
 * 
 * 1. Artist Follows Table
 * 2. Content Likes Table (for songs and albums)
 * 3. Content Comments Table (for songs and albums)
 */

async function createArtistFollowsTable() {
  const TABLE_NAME = 'lyricscape-artist-follows-prod';
  
  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },  // FOLLOW#userId
      { AttributeName: 'SK', KeyType: 'RANGE' }, // ARTIST#artistId
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // ARTIST#artistId (for reverse lookup)
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // FOLLOW#timestamp
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ArtistFollowersIndex',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' }
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
    console.log('✅ Artist Follows table created successfully!');
    console.log('\nSchema:');
    console.log('- PK: FOLLOW#userId');
    console.log('- SK: ARTIST#artistId');
    console.log('- GSI1PK: ARTIST#artistId (for counting followers)');
    console.log('- Attributes: artist_id, artist_name, followed_at\n');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('⚠️  Table already exists');
    } else {
      console.error('Error creating table:', error);
      throw error;
    }
  }
}

async function createContentLikesTable() {
  const TABLE_NAME = 'lyricscape-content-likes-prod';
  
  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },  // LIKE#userId#type (song/album)
      { AttributeName: 'SK', KeyType: 'RANGE' }, // ITEM#itemId
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // ITEM#type#itemId (for reverse lookup)
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // LIKE#timestamp
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'ItemLikesIndex',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' }
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
    console.log('✅ Content Likes table created successfully!');
    console.log('\nSchema:');
    console.log('- PK: LIKE#userId#type (song/album)');
    console.log('- SK: ITEM#itemId');
    console.log('- GSI1PK: ITEM#type#itemId (for counting likes)');
    console.log('- Attributes: item_id, item_type, item_name, liked_at\n');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('⚠️  Table already exists');
    } else {
      console.error('Error creating table:', error);
      throw error;
    }
  }
}

async function createContentCommentsTable() {
  const TABLE_NAME = 'lyricscape-content-comments-prod';
  
  const params = {
    TableName: TABLE_NAME,
    KeySchema: [
      { AttributeName: 'PK', KeyType: 'HASH' },  // ITEM#type#itemId (song/album)
      { AttributeName: 'SK', KeyType: 'RANGE' }, // COMMENT#timestamp#commentId
    ],
    AttributeDefinitions: [
      { AttributeName: 'PK', AttributeType: 'S' },
      { AttributeName: 'SK', AttributeType: 'S' },
      { AttributeName: 'GSI1PK', AttributeType: 'S' }, // USER#userId (for user's comments)
      { AttributeName: 'GSI1SK', AttributeType: 'S' }, // COMMENT#timestamp
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserCommentsIndex',
        KeySchema: [
          { AttributeName: 'GSI1PK', KeyType: 'HASH' },
          { AttributeName: 'GSI1SK', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' }
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
    console.log('✅ Content Comments table created successfully!');
    console.log('\nSchema:');
    console.log('- PK: ITEM#type#itemId');
    console.log('- SK: COMMENT#timestamp#commentId');
    console.log('- GSI1PK: USER#userId (for listing user\'s comments)');
    console.log('- Attributes: comment_id, user_id, user_name, user_email, text, created_at, updated_at\n');
  } catch (error) {
    if (error.name === 'ResourceInUseException') {
      console.log('⚠️  Table already exists');
    } else {
      console.error('Error creating table:', error);
      throw error;
    }
  }
}

async function main() {
  console.log('🎯 Creating Social Features Tables\n');
  console.log('This will create 3 tables:');
  console.log('1. lyricscape-artist-follows-prod');
  console.log('2. lyricscape-content-likes-prod');
  console.log('3. lyricscape-content-comments-prod\n');
  
  await createArtistFollowsTable();
  await createContentLikesTable();
  await createContentCommentsTable();
  
  console.log('\n🎉 All social tables created successfully!\n');
  console.log('Features enabled:');
  console.log('✅ Users can follow/unfollow artists');
  console.log('✅ Users can like/unlike songs and albums');
  console.log('✅ Users can comment on songs and albums');
  console.log('✅ View follower counts, like counts, and comments\n');
}

main().catch(console.error);
