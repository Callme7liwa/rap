const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, DeleteCommand, ScanCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const VOTES_TABLE = process.env.VOTES_TABLE || 'lyricscape-votes-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';

// Helper to get current period (YYYY-MM format)
function getCurrentPeriod() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

// Helper to get month name from period
function getMonthName(period) {
  const [year, month] = period.split('-');
  const date = new Date(year, parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// ============================================
// POST /api/voting-monthly/vote - Vote for an item in current month
// ============================================
router.post('/vote', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, itemId } = req.body; // type: song, album, artist
    const period = getCurrentPeriod();

    if (!['song', 'album', 'artist'].includes(type)) {
      return res.status(400).json({ error: 'Invalid type' });
    }

    if (!itemId) {
      return res.status(400).json({ error: 'itemId required' });
    }

    const itemIdNum = Number(itemId);

    // Check existing votes for this month
    const existingVotesResult = await dynamoClient.send(new QueryCommand({
      TableName: VOTES_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `VOTE#${userId}#${type}#${period}`,
      },
    }));

    const existingVotes = existingVotesResult.Items || [];
    const existingVoteForItem = existingVotes.find(v => v.item_id === itemIdNum);

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
        action: 'removed',
        period
      });
    }

    // Check if user already has 2 votes for this category this month
    if (existingVotes.length >= 2) {
      return res.status(400).json({ 
        success: false,
        error: `You can only vote for 2 ${type}s per month. Remove one first.`,
        max_votes_reached: true
      });
    }

    const timestamp = Date.now();

    // Add new vote with period
    await dynamoClient.send(new PutCommand({
      TableName: VOTES_TABLE,
      Item: {
        PK: `VOTE#${userId}#${type}#${period}`,
        SK: `ITEM#${itemIdNum}`,
        item_id: itemIdNum,
        item_type: type,
        period: period,
        voted_at: timestamp,
      }
    }));

    res.json({
      success: true,
      message: 'Vote added successfully',
      action: 'added',
      period
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ error: 'Failed to vote', details: error.message });
  }
});

// ============================================
// GET /api/voting-monthly/my-votes - Get user's votes for current month
// ============================================
router.get('/my-votes', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const period = req.query.period || getCurrentPeriod();
    const types = ['song', 'album', 'artist'];
    const votes = {};

    for (const type of types) {
      const result = await dynamoClient.send(new QueryCommand({
        TableName: VOTES_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `VOTE#${userId}#${type}#${period}`,
        },
      }));

      votes[type] = (result.Items || []).map(item => item.item_id);
    }

    res.json({ votes, period, period_name: getMonthName(period) });
  } catch (error) {
    console.error('Get my votes error:', error);
    res.status(500).json({ error: 'Failed to get votes', details: error.message });
  }
});

// ============================================
// GET /api/voting-monthly/top - Get top voted items for a period
// ============================================
router.get('/top', async (req, res) => {
  try {
    const period = req.query.period || getCurrentPeriod();
    const limit = parseInt(req.query.limit) || 5;

    // Scan all votes for this period
    const result = await dynamoClient.send(new ScanCommand({
      TableName: VOTES_TABLE,
      FilterExpression: 'period = :period AND begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':period': period,
        ':prefix': 'VOTE#'
      }
    }));

    const votes = result.Items || [];

    // Group by type and item_id
    const voteCounts = {
      song: {},
      album: {},
      artist: {}
    };

    votes.forEach(vote => {
      const type = vote.item_type;
      const itemId = vote.item_id;
      if (!voteCounts[type][itemId]) {
        voteCounts[type][itemId] = 0;
      }
      voteCounts[type][itemId]++;
    });

    // Get top items for each type
    const topItems = {
      period,
      period_name: getMonthName(period),
      song: [],
      album: [],
      artist: []
    };

    for (const type of ['song', 'album', 'artist']) {
      const sorted = Object.entries(voteCounts[type])
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([itemId, count]) => ({ id: Number(itemId), votes: count }));

      // Fetch item details
      const TABLE_MAP = {
        song: SONGS_TABLE,
        album: ALBUMS_TABLE,
        artist: ARTISTS_TABLE
      };

      const itemsWithDetails = await Promise.all(
        sorted.map(async (item) => {
          try {
            const itemResult = await dynamoClient.send(new GetCommand({
              TableName: TABLE_MAP[type],
              Key: { id: item.id }
            }));

            return {
              ...itemResult.Item,
              vote_count: item.votes
            };
          } catch (error) {
            console.error(`Error fetching ${type} ${item.id}:`, error);
            return { id: item.id, vote_count: item.votes };
          }
        })
      );

      topItems[type] = itemsWithDetails;
    }

    res.json(topItems);
  } catch (error) {
    console.error('Get top items error:', error);
    res.status(500).json({ error: 'Failed to get top items', details: error.message });
  }
});

// ============================================
// GET /api/voting-monthly/history - Get list of all voting periods
// ============================================
router.get('/history', async (req, res) => {
  try {
    // Scan for all unique periods
    const result = await dynamoClient.send(new ScanCommand({
      TableName: VOTES_TABLE,
      FilterExpression: 'attribute_exists(period) AND begins_with(PK, :prefix)',
      ExpressionAttributeValues: {
        ':prefix': 'VOTE#'
      },
      ProjectionExpression: 'period'
    }));

    const periods = [...new Set((result.Items || []).map(item => item.period))]
      .sort()
      .reverse(); // Most recent first

    const history = periods.map(period => ({
      period,
      name: getMonthName(period),
      is_current: period === getCurrentPeriod()
    }));

    res.json({ periods: history, current_period: getCurrentPeriod() });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get history', details: error.message });
  }
});

// ============================================
// GET /api/voting-monthly/item/:type/:id/count - Get vote count for item in period
// ============================================
router.get('/item/:type/:id/count', async (req, res) => {
  try {
    const { type, id } = req.params;
    const period = req.query.period || getCurrentPeriod();
    const itemId = Number(id);

    const result = await dynamoClient.send(new ScanCommand({
      TableName: VOTES_TABLE,
      FilterExpression: 'item_type = :type AND item_id = :id AND period = :period',
      ExpressionAttributeValues: {
        ':type': type,
        ':id': itemId,
        ':period': period
      }
    }));

    res.json({ 
      count: result.Items?.length || 0,
      period,
      period_name: getMonthName(period)
    });
  } catch (error) {
    console.error('Get vote count error:', error);
    res.status(500).json({ error: 'Failed to get vote count', details: error.message });
  }
});

module.exports = router;
