const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';

// Helper function to get table name and key based on content type
const getTableConfig = (type) => {
  switch (type) {
    case 'artist':
      return { table: ARTISTS_TABLE, key: 'artist_id' };
    case 'album':
      return { table: ALBUMS_TABLE, key: 'album_id' };
    case 'song':
      return { table: SONGS_TABLE, key: 'song_id' };
    default:
      return null;
  }
};

// ============================================
// POST /api/content/:type/:id/like - Like/Unlike content (artist, album, song)
// ============================================
router.post('/:type/:id/like', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, id } = req.params;

    const config = getTableConfig(type);
    if (!config) {
      return res.status(400).json({ error: 'Invalid content type. Must be artist, album, or song' });
    }

    // Get the content item
    const result = await dynamoClient.send(new GetCommand({
      TableName: config.table,
      Key: { [config.key]: id }
    }));

    if (!result.Item) {
      return res.status(404).json({ error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found` });
    }

    const item = result.Item;

    // Check if user already liked
    const likedBy = item.liked_by || {};
    const hasLiked = !!likedBy[userId];

    if (hasLiked) {
      // Unlike
      delete likedBy[userId];

      await dynamoClient.send(new UpdateCommand({
        TableName: config.table,
        Key: { [config.key]: id },
        UpdateExpression: 'SET liked_by = :likedBy, likes = if_not_exists(likes, :zero) - :dec',
        ExpressionAttributeValues: {
          ':likedBy': likedBy,
          ':zero': 0,
          ':dec': 1
        }
      }));

      res.json({
        success: true,
        liked: false,
        likes: Math.max(0, (item.likes || 0) - 1)
      });
    } else {
      // Like
      likedBy[userId] = Date.now();

      await dynamoClient.send(new UpdateCommand({
        TableName: config.table,
        Key: { [config.key]: id },
        UpdateExpression: 'SET liked_by = :likedBy, likes = if_not_exists(likes, :zero) + :inc',
        ExpressionAttributeValues: {
          ':likedBy': likedBy,
          ':zero': 0,
          ':inc': 1
        }
      }));

      res.json({
        success: true,
        liked: true,
        likes: (item.likes || 0) + 1
      });
    }
  } catch (error) {
    console.error(`Like ${req.params.type} error:`, error);
    res.status(500).json({ error: `Failed to like ${req.params.type}`, details: error.message });
  }
});

// ============================================
// GET /api/content/:type/:id/status - Get user's interaction status with content
// ============================================
router.get('/:type/:id/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, id } = req.params;

    const config = getTableConfig(type);
    if (!config) {
      return res.status(400).json({ error: 'Invalid content type. Must be artist, album, or song' });
    }

    // Get the content item
    const result = await dynamoClient.send(new GetCommand({
      TableName: config.table,
      Key: { [config.key]: id }
    }));

    if (!result.Item) {
      return res.status(404).json({ error: `${type.charAt(0).toUpperCase() + type.slice(1)} not found` });
    }

    const item = result.Item;

    res.json({
      liked: !!(item.liked_by && item.liked_by[userId]),
      likes: item.likes || 0
    });
  } catch (error) {
    console.error(`Get ${req.params.type} status error:`, error);
    res.status(500).json({ error: `Failed to get ${req.params.type} status`, details: error.message });
  }
});

// ============================================
// GET /api/content/:type - Get all content of a specific type
// (Useful for listing all songs/albums/artists with like counts)
// ============================================
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const config = getTableConfig(type);
    
    if (!config) {
      return res.status(400).json({ error: 'Invalid content type. Must be artist, album, or song' });
    }

    const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
    const result = await dynamoClient.send(new ScanCommand({
      TableName: config.table
    }));

    // Add like count to each item
    const items = (result.Items || []).map(item => ({
      ...item,
      likes: item.likes || 0,
      liked_by_count: Object.keys(item.liked_by || {}).length
    }));

    res.json({ items });
  } catch (error) {
    console.error(`Get ${req.params.type} list error:`, error);
    res.status(500).json({ error: `Failed to get ${req.params.type} list`, details: error.message });
  }
});

module.exports = router;
