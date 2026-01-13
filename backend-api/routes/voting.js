const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand, DeleteCommand, ScanCommand, BatchGetCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const VOTES_TABLE = process.env.VOTES_TABLE || 'lyricscape-votes-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';

// Categories: song_month, song_year, album_month, album_year, artist_month, artist_year
// PK format: POLL#<category>#<period> (e.g., POLL#song#2025-11 or POLL#album#2025)
// SK format: METADATA (for poll info) or NOMINEE#<itemId> (for nominees/votes)

// ============================================
// POST /api/voting/polls - Create voting poll (Admin only)
// ============================================
router.post('/polls', verifyToken, async (req, res) => {
  try {
    // Check if user is admin
    const isAdmin = req.user['cognito:groups']?.includes('admin');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { category, period, nominees } = req.body;
    // category: 'song', 'album', 'artist'
    // period: '2025-11' (for month), '2025' (for year)
    // nominees: [{ id: 123, name: 'Song Title', image: 'url', artist: 'Artist Name' }]

    if (!category || !period || !nominees || nominees.length < 2) {
      return res.status(400).json({ error: 'Category, period, and at least 2 nominees required' });
    }

    const pollId = `POLL#${category}#${period}`;
    const timestamp = Date.now();

    // Create poll metadata
    await dynamoClient.send(new PutCommand({
      TableName: VOTES_TABLE,
      Item: {
        PK: pollId,
        SK: 'METADATA',
        category,
        period,
        start_date: timestamp,
        end_date: period.includes('-') 
          ? new Date(period + '-01').setMonth(new Date(period + '-01').getMonth() + 1) // End of month
          : new Date(period + '-12-31').getTime(), // End of year
        is_active: true,
        total_votes: 0,
        created_at: timestamp,
        created_by: req.user.sub,
      }
    }));

    // Create nominee entries
    for (const nominee of nominees) {
      await dynamoClient.send(new PutCommand({
        TableName: VOTES_TABLE,
        Item: {
          PK: pollId,
          SK: `NOMINEE#${nominee.id}`,
          GSI1PK: `ITEM#${category}#${nominee.id}`,
          GSI1SK: pollId,
          item_id: nominee.id,
          item_type: category,
          name: nominee.name,
          image: nominee.image || null,
          artist_name: nominee.artist_name || null,
          album_name: nominee.album_name || null,
          votes: 0,
          percentage: 0,
        }
      }));
    }

    res.json({
      success: true,
      poll_id: pollId,
      message: 'Voting poll created successfully'
    });
  } catch (error) {
    console.error('Create poll error:', error);
    res.status(500).json({ error: 'Failed to create poll', details: error.message });
  }
});

// ============================================
// GET /api/voting/polls - Get all active polls
// ============================================
router.get('/polls', async (req, res) => {
  try {
    const { category } = req.query; // song, album, artist

    // Scan for all active polls
    const result = await dynamoClient.send(new ScanCommand({
      TableName: VOTES_TABLE,
      FilterExpression: 'SK = :metadata AND is_active = :active',
      ExpressionAttributeValues: {
        ':metadata': 'METADATA',
        ':active': true,
      }
    }));

    let polls = result.Items || [];

    // Filter by category if provided
    if (category) {
      polls = polls.filter(p => p.category === category);
    }

    // Get nominees for each poll
    const pollsWithNominees = await Promise.all(polls.map(async (poll) => {
      const nomineesResult = await dynamoClient.send(new QueryCommand({
        TableName: VOTES_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': poll.PK,
          ':sk': 'NOMINEE#',
        }
      }));

      const nominees = (nomineesResult.Items || []).sort((a, b) => b.votes - a.votes);

      return {
        poll_id: poll.PK,
        category: poll.category,
        period: poll.period,
        start_date: poll.start_date,
        end_date: poll.end_date,
        is_active: poll.is_active,
        total_votes: poll.total_votes || 0,
        nominees,
      };
    }));

    res.json({ polls: pollsWithNominees });
  } catch (error) {
    console.error('Get polls error:', error);
    res.status(500).json({ error: 'Failed to get polls', details: error.message });
  }
});

// ============================================
// GET /api/voting/polls/:id - Get specific poll
// ============================================
router.get('/polls/:id', async (req, res) => {
  try {
    const pollId = req.params.id;

    // Get poll metadata
    const pollResult = await dynamoClient.send(new GetCommand({
      TableName: VOTES_TABLE,
      Key: { PK: pollId, SK: 'METADATA' }
    }));

    if (!pollResult.Item) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    // Get nominees
    const nomineesResult = await dynamoClient.send(new QueryCommand({
      TableName: VOTES_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': pollId,
        ':sk': 'NOMINEE#',
      }
    }));

    const nominees = (nomineesResult.Items || []).sort((a, b) => b.votes - a.votes);

    res.json({
      poll: {
        poll_id: pollResult.Item.PK,
        ...pollResult.Item,
        nominees,
      }
    });
  } catch (error) {
    console.error('Get poll error:', error);
    res.status(500).json({ error: 'Failed to get poll', details: error.message });
  }
});

// ============================================
// POST /api/voting/vote - Cast a vote
// ============================================
router.post('/vote', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { poll_id, nominee_id } = req.body;

    if (!poll_id || !nominee_id) {
      return res.status(400).json({ error: 'poll_id and nominee_id are required' });
    }

    // Check if user already voted in this poll
    const existingVote = await dynamoClient.send(new GetCommand({
      TableName: VOTES_TABLE,
      Key: {
        PK: `VOTE#${userId}#${poll_id}`,
        SK: 'METADATA',
      }
    }));

    if (existingVote.Item) {
      return res.status(400).json({ error: 'You have already voted in this poll' });
    }

    // Get poll metadata
    const pollResult = await dynamoClient.send(new GetCommand({
      TableName: VOTES_TABLE,
      Key: { PK: poll_id, SK: 'METADATA' }
    }));

    if (!pollResult.Item) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (!pollResult.Item.is_active) {
      return res.status(400).json({ error: 'Poll is not active' });
    }

    // Get nominee
    const nomineeResult = await dynamoClient.send(new GetCommand({
      TableName: VOTES_TABLE,
      Key: { PK: poll_id, SK: `NOMINEE#${nominee_id}` }
    }));

    if (!nomineeResult.Item) {
      return res.status(404).json({ error: 'Nominee not found' });
    }

    const timestamp = Date.now();

    // Record the vote
    await dynamoClient.send(new PutCommand({
      TableName: VOTES_TABLE,
      Item: {
        PK: `VOTE#${userId}#${poll_id}`,
        SK: 'METADATA',
        GSI2PK: `USER#${userId}`,
        GSI2SK: `VOTE#${timestamp}`,
        poll_id,
        nominee_id,
        nominee_name: nomineeResult.Item.name,
        category: pollResult.Item.category,
        voted_at: timestamp,
      }
    }));

    // Update nominee vote count
    await dynamoClient.send(new UpdateCommand({
      TableName: VOTES_TABLE,
      Key: { PK: poll_id, SK: `NOMINEE#${nominee_id}` },
      UpdateExpression: 'ADD votes :inc',
      ExpressionAttributeValues: { ':inc': 1 }
    }));

    // Update poll total votes
    await dynamoClient.send(new UpdateCommand({
      TableName: VOTES_TABLE,
      Key: { PK: poll_id, SK: 'METADATA' },
      UpdateExpression: 'ADD total_votes :inc',
      ExpressionAttributeValues: { ':inc': 1 }
    }));

    // Recalculate percentages
    const nomineesResult = await dynamoClient.send(new QueryCommand({
      TableName: VOTES_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': poll_id,
        ':sk': 'NOMINEE#',
      }
    }));

    const totalVotes = (pollResult.Item.total_votes || 0) + 1;
    for (const nominee of nomineesResult.Items || []) {
      const percentage = totalVotes > 0 ? ((nominee.votes + (nominee.SK === `NOMINEE#${nominee_id}` ? 1 : 0)) / totalVotes * 100) : 0;
      await dynamoClient.send(new UpdateCommand({
        TableName: VOTES_TABLE,
        Key: { PK: poll_id, SK: nominee.SK },
        UpdateExpression: 'SET percentage = :pct',
        ExpressionAttributeValues: { ':pct': Math.round(percentage * 100) / 100 }
      }));
    }

    res.json({
      success: true,
      message: 'Vote cast successfully'
    });
  } catch (error) {
    console.error('Cast vote error:', error);
    res.status(500).json({ error: 'Failed to cast vote', details: error.message });
  }
});

// ============================================
// GET /api/voting/user/votes - Get user's voting history
// ============================================
router.get('/user/votes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Query user's votes using GSI
    const result = await dynamoClient.send(new QueryCommand({
      TableName: VOTES_TABLE,
      IndexName: 'UserVotesIndex',
      KeyConditionExpression: 'GSI2PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
      },
      ScanIndexForward: false, // Most recent first
    }));

    const votes = (result.Items || []).map(item => ({
      vote_id: item.PK,
      poll_id: item.poll_id,
      nominee_id: item.nominee_id,
      nominee_name: item.nominee_name,
      category: item.category,
      voted_at: item.voted_at,
    }));

    res.json({ votes });
  } catch (error) {
    console.error('Get user votes error:', error);
    res.status(500).json({ error: 'Failed to get user votes', details: error.message });
  }
});

// ============================================
// GET /api/voting/item/:type/:id/stats - Get vote stats for an item
// ============================================
router.get('/item/:type/:id/stats', async (req, res) => {
  try {
    const { type, id } = req.params; // type: song, album, artist

    // Query by item using GSI
    const result = await dynamoClient.send(new QueryCommand({
      TableName: VOTES_TABLE,
      IndexName: 'ItemIndex',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `ITEM#${type}#${id}`,
      }
    }));

    const nominations = result.Items || [];
    
    // Group by poll and calculate stats
    const stats = nominations.map(nom => ({
      poll_id: nom.GSI1SK,
      category: nom.item_type,
      votes: nom.votes || 0,
      percentage: nom.percentage || 0,
      name: nom.name,
    }));

    const totalVotes = nominations.reduce((sum, nom) => sum + (nom.votes || 0), 0);
    const wonPolls = nominations.filter(nom => nom.percentage > 50).length;

    res.json({
      item_id: id,
      item_type: type,
      total_votes: totalVotes,
      nominations: stats.length,
      won_polls: wonPolls,
      stats,
    });
  } catch (error) {
    console.error('Get item stats error:', error);
    res.status(500).json({ error: 'Failed to get item stats', details: error.message });
  }
});

// ============================================
// POST /api/voting/item/:type/:id - Vote for an item (max 2 per category)
// ============================================
router.post('/item/:type/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, id } = req.params; // type: song, album, artist
    const itemId = Number(id);

    if (!['song', 'album', 'artist'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be song, album, or artist' });
    }

    // Check for existing votes in this category (max 2)
    const existingVotesResult = await dynamoClient.send(new QueryCommand({
      TableName: VOTES_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `VOTE#${userId}#${type}`,
      },
    }));

    const existingVotes = existingVotesResult.Items || [];
    const existingVoteForItem = existingVotes.find(v => v.item_id === itemId);

    // If voting for same item, remove vote (toggle)
    if (existingVoteForItem) {
      await dynamoClient.send(new DeleteCommand({
        TableName: VOTES_TABLE,
        Key: {
          PK: existingVoteForItem.PK,
          SK: existingVoteForItem.SK,
        }
      }));

      return res.json({
        success: true,
        message: 'Vote removed',
        action: 'removed'
      });
    }

    // Check if user already has 2 votes for this category
    if (existingVotes.length >= 2) {
      return res.status(400).json({ 
        success: false,
        error: `You can only vote for 2 ${type}s. Remove one of your votes first.`,
        max_votes_reached: true
      });
    }

    const timestamp = Date.now();

    // Add new vote
    await dynamoClient.send(new PutCommand({
      TableName: VOTES_TABLE,
      Item: {
        PK: `VOTE#${userId}#${type}`,
        SK: `ITEM#${itemId}`,
        GSI2PK: `USER#${userId}`,
        GSI2SK: `VOTE#${timestamp}`,
        item_id: itemId,
        item_type: type,
        category: type,
        voted_at: timestamp,
      }
    }));

    res.json({
      success: true,
      message: 'Vote added successfully',
      action: 'added'
    });
  } catch (error) {
    console.error('Vote for item error:', error);
    res.status(500).json({ error: 'Failed to vote', details: error.message });
  }
});

// ============================================
// GET /api/voting/user/item-votes - Get user's current votes for items (up to 2 per category)
// ============================================
router.get('/user/item-votes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Get user's votes for direct items (not polls)
    // PK format: VOTE#<userId>#<type> (song/album/artist)
    const types = ['song', 'album', 'artist'];
    const votes = {};

    for (const type of types) {
      const result = await dynamoClient.send(new QueryCommand({
        TableName: VOTES_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `VOTE#${userId}#${type}`,
        },
      }));

      if (result.Items && result.Items.length > 0) {
        // Return array of item IDs (max 2)
        votes[type] = result.Items.map(item => item.item_id);
      } else {
        votes[type] = [];
      }
    }

    res.json({ votes }); // { song: [123, 456], album: [789], artist: [111, 222] }
  } catch (error) {
    console.error('Get user item votes error:', error);
    res.status(500).json({ error: 'Failed to get votes', details: error.message });
  }
});

// ============================================
// GET /api/voting/item/:type/:id/count - Get vote count for an item
// ============================================
router.get('/item/:type/:id/count', async (req, res) => {
  try {
    const { type, id } = req.params;

    // Query UserVotesIndex to count all votes for this item
    // PK for direct votes: VOTE#<userId>#<category>
    // We need to scan and filter by item_id and item_type
    const result = await dynamoClient.send(new ScanCommand({
      TableName: VOTES_TABLE,
      FilterExpression: 'item_type = :type AND item_id = :id AND begins_with(PK, :votePrefix)',
      ExpressionAttributeValues: {
        ':type': type,
        ':id': Number(id),
        ':votePrefix': 'VOTE#'
      }
    }));

    const voteCount = result.Items?.length || 0;

    res.json({
      item_id: Number(id),
      item_type: type,
      vote_count: voteCount,
    });
  } catch (error) {
    console.error('Get vote count error:', error);
    res.status(500).json({ error: 'Failed to get vote count', details: error.message });
  }
});

// ============================================
// GET /api/voting/top - Get top voted items by category
// ============================================
router.get('/top', async (req, res) => {
  try {
    const { category, limit = 5 } = req.query; // category: song, album, artist, or 'all'
    const types = category && category !== 'all' ? [category] : ['song', 'album', 'artist'];
    const topItems = {};

    for (const type of types) {
      // Scan for all votes of this type
      const result = await dynamoClient.send(new ScanCommand({
        TableName: VOTES_TABLE,
        FilterExpression: 'item_type = :type AND begins_with(PK, :votePrefix)',
        ExpressionAttributeValues: {
          ':type': type,
          ':votePrefix': 'VOTE#'
        }
      }));

      // Count votes per item
      const voteCounts = {};
      for (const vote of result.Items || []) {
        voteCounts[vote.item_id] = (voteCounts[vote.item_id] || 0) + 1;
      }

      // Sort by vote count and get top N
      const sortedItems = Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, Number(limit))
        .map(([itemId, voteCount]) => ({
          item_id: Number(itemId),
          item_type: type,
          vote_count: voteCount
        }));

      // Fetch item details
      const itemsWithDetails = await Promise.all(sortedItems.map(async (item) => {
        try {
          let tableName, details;
          if (type === 'song') {
            tableName = SONGS_TABLE;
            const itemResult = await dynamoClient.send(new GetCommand({
              TableName: tableName,
              Key: { id: item.item_id }
            }));
            details = itemResult.Item ? {
              id: itemResult.Item.id,
              title: itemResult.Item.title,
              primary_artist_name: itemResult.Item.primary_artist_name,
              song_art_image_url: itemResult.Item.song_art_image_url,
            } : null;
          } else if (type === 'album') {
            tableName = ALBUMS_TABLE;
            const itemResult = await dynamoClient.send(new GetCommand({
              TableName: tableName,
              Key: { id: item.item_id }
            }));
            details = itemResult.Item ? {
              id: itemResult.Item.id,
              name: itemResult.Item.name,
              artist_name: itemResult.Item.artist_name,
              cover_art_url: itemResult.Item.cover_art_url,
            } : null;
          } else if (type === 'artist') {
            tableName = ARTISTS_TABLE;
            const itemResult = await dynamoClient.send(new GetCommand({
              TableName: tableName,
              Key: { id: item.item_id }
            }));
            details = itemResult.Item ? {
              id: itemResult.Item.id,
              name: itemResult.Item.name,
              image_url: itemResult.Item.image_url,
            } : null;
          }

          return details ? { ...details, vote_count: item.vote_count } : null;
        } catch (error) {
          console.error(`Error fetching ${type} ${item.item_id}:`, error);
          return null;
        }
      }));

      topItems[type] = itemsWithDetails.filter(item => item !== null);
    }

    res.json({ top: topItems });
  } catch (error) {
    console.error('Get top items error:', error);
    res.status(500).json({ error: 'Failed to get top items', details: error.message });
  }
});

module.exports = router;
