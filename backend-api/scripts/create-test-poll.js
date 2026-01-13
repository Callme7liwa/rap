// Script to create a test poll
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const VOTES_TABLE = 'lyricscape-votes-prod';

async function createTestPoll() {
  const pollId = 'POLL#song#2025-11';
  const timestamp = Date.now();
  
  // Create poll metadata
  await dynamoClient.send(new PutCommand({
    TableName: VOTES_TABLE,
    Item: {
      PK: pollId,
      SK: 'METADATA',
      category: 'song',
      period: '2025-11',
      start_date: timestamp,
      end_date: new Date('2025-11-30').getTime(),
      is_active: true,
      total_votes: 0,
      created_at: timestamp,
    }
  }));

  console.log('✅ Poll metadata created');

  // Create nominees (example songs)
  const nominees = [
    {
      id: 340785,
      name: '3ndk Cha3la',
      artist_name: 'Dizzy DROS',
      image: 'https://images.genius.com/65d534ecc1c145280074842 1d49282ed.1000x1000x1.jpg'
    },
    {
      id: 4491318,
      name: 'Mira',
      artist_name: 'ElGrandeToto',
      image: 'https://images.genius.com/f51964524c5f599a473453a15fc1ee12.486x486x1.png'
    },
    {
      id: 8701596,
      name: '999',
      artist_name: '7ARI',
      image: 'https://images.genius.com/a1fef57f0691d1c8cfa687929f2438cd.1000x1000x1.jpg'
    }
  ];

  for (const nominee of nominees) {
    await dynamoClient.send(new PutCommand({
      TableName: VOTES_TABLE,
      Item: {
        PK: pollId,
        SK: `NOMINEE#${nominee.id}`,
        GSI1PK: `ITEM#song#${nominee.id}`,
        GSI1SK: pollId,
        item_id: nominee.id,
        item_type: 'song',
        name: nominee.name,
        image: nominee.image,
        artist_name: nominee.artist_name,
        votes: 0,
        percentage: 0,
      }
    }));
    console.log(`✅ Nominee added: ${nominee.name}`);
  }

  console.log('\n✅ Test poll created successfully!');
  console.log('📝 Poll ID:', pollId);
  console.log('🎵 Category: Song of the Month');
  console.log('📅 Period: November 2025');
}

createTestPoll().catch(console.error);
