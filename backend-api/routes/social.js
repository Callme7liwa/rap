const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand, GetCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const FOLLOWS_TABLE = 'lyricscape-artist-follows-prod';
const LIKES_TABLE = 'lyricscape-content-likes-prod';
const COMMENTS_TABLE = 'lyricscape-content-comments-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';

// ============================================
// ARTIST FOLLOWS
// ============================================

// POST /api/social/follow/artist/:id - Follow/Unfollow artist
router.post('/follow/artist/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const artistId = Number(req.params.id);

    const PK = `FOLLOW#${userId}`;
    const SK = `ARTIST#${artistId}`;

    // Check if already following
    const existing = await dynamoClient.send(new GetCommand({
      TableName: FOLLOWS_TABLE,
      Key: { PK, SK }
    }));

    if (existing.Item) {
      // Unfollow
      await dynamoClient.send(new DeleteCommand({
        TableName: FOLLOWS_TABLE,
        Key: { PK, SK }
      }));

      return res.json({
        success: true,
        action: 'unfollowed',
        following: false
      });
    }

    // Get artist details
    const artistResult = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: artistId }
    }));

    if (!artistResult.Item) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Follow
    const timestamp = Date.now();
    await dynamoClient.send(new PutCommand({
      TableName: FOLLOWS_TABLE,
      Item: {
        PK,
        SK,
        GSI1PK: `ARTIST#${artistId}`,
        GSI1SK: `FOLLOW#${timestamp}`,
        user_id: userId,
        artist_id: artistId,
        artist_name: artistResult.Item.name,
        artist_image: artistResult.Item.image_url,
        followed_at: timestamp
      }
    }));

    res.json({
      success: true,
      action: 'followed',
      following: true
    });
  } catch (error) {
    console.error('Follow artist error:', error);
    res.status(500).json({ error: 'Failed to follow/unfollow artist' });
  }
});

// GET /api/social/follow/artist/:id/check - Check if following
router.get('/follow/artist/:id/check', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const artistId = Number(req.params.id);

    const result = await dynamoClient.send(new GetCommand({
      TableName: FOLLOWS_TABLE,
      Key: {
        PK: `FOLLOW#${userId}`,
        SK: `ARTIST#${artistId}`
      }
    }));

    res.json({ following: !!result.Item });
  } catch (error) {
    console.error('Check follow error:', error);
    res.status(500).json({ error: 'Failed to check follow status' });
  }
});

// GET /api/social/follow/artist/:id/count - Get follower count
router.get('/follow/artist/:id/count', async (req, res) => {
  try {
    const artistId = Number(req.params.id);

    const result = await dynamoClient.send(new QueryCommand({
      TableName: FOLLOWS_TABLE,
      IndexName: 'ArtistFollowersIndex',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `ARTIST#${artistId}`
      },
      Select: 'COUNT'
    }));

    res.json({ count: result.Count || 0 });
  } catch (error) {
    console.error('Get follower count error:', error);
    res.status(500).json({ error: 'Failed to get follower count' });
  }
});

// GET /api/social/follow/my-artists - Get user's followed artists
router.get('/follow/my-artists', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    const result = await dynamoClient.send(new QueryCommand({
      TableName: FOLLOWS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `FOLLOW#${userId}`
      }
    }));

    const follows = (result.Items || []).map(item => ({
      artist_id: item.artist_id,
      artist_name: item.artist_name,
      artist_image: item.artist_image,
      followed_at: item.followed_at
    }));

    res.json({ artists: follows });
  } catch (error) {
    console.error('Get my artists error:', error);
    res.status(500).json({ error: 'Failed to get followed artists' });
  }
});

// ============================================
// CONTENT LIKES (Songs & Albums)
// ============================================

// POST /api/social/like/:type/:id - Like/Unlike content
router.post('/like/:type/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, id } = req.params; // type: song or album
    const itemId = Number(id);

    if (!['song', 'album'].includes(type)) {
      return res.status(400).json({ error: 'Type must be song or album' });
    }

    const PK = `LIKE#${userId}#${type}`;
    const SK = `ITEM#${itemId}`;

    // Check if already liked
    const existing = await dynamoClient.send(new GetCommand({
      TableName: LIKES_TABLE,
      Key: { PK, SK }
    }));

    if (existing.Item) {
      // Unlike
      await dynamoClient.send(new DeleteCommand({
        TableName: LIKES_TABLE,
        Key: { PK, SK }
      }));

      return res.json({
        success: true,
        action: 'unliked',
        liked: false
      });
    }

    // Get item details
    const TABLE = type === 'song' ? SONGS_TABLE : ALBUMS_TABLE;
    const itemResult = await dynamoClient.send(new GetCommand({
      TableName: TABLE,
      Key: { id: itemId }
    }));

    if (!itemResult.Item) {
      return res.status(404).json({ error: `${type} not found` });
    }

    // Like
    const timestamp = Date.now();
    await dynamoClient.send(new PutCommand({
      TableName: LIKES_TABLE,
      Item: {
        PK,
        SK,
        GSI1PK: `ITEM#${type}#${itemId}`,
        GSI1SK: `LIKE#${timestamp}`,
        user_id: userId,
        item_id: itemId,
        item_type: type,
        item_name: itemResult.Item.title || itemResult.Item.name,
        liked_at: timestamp
      }
    }));

    res.json({
      success: true,
      action: 'liked',
      liked: true
    });
  } catch (error) {
    console.error('Like content error:', error);
    res.status(500).json({ error: 'Failed to like/unlike content' });
  }
});

// GET /api/social/like/:type/:id/check - Check if liked
router.get('/like/:type/:id/check', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, id } = req.params;
    const itemId = Number(id);

    const result = await dynamoClient.send(new GetCommand({
      TableName: LIKES_TABLE,
      Key: {
        PK: `LIKE#${userId}#${type}`,
        SK: `ITEM#${itemId}`
      }
    }));

    res.json({ liked: !!result.Item });
  } catch (error) {
    console.error('Check like error:', error);
    res.status(500).json({ error: 'Failed to check like status' });
  }
});

// GET /api/social/like/:type/:id/count - Get like count
router.get('/like/:type/:id/count', async (req, res) => {
  try {
    const { type, id } = req.params;
    const itemId = Number(id);

    const result = await dynamoClient.send(new QueryCommand({
      TableName: LIKES_TABLE,
      IndexName: 'ItemLikesIndex',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `ITEM#${type}#${itemId}`
      },
      Select: 'COUNT'
    }));

    res.json({ count: result.Count || 0 });
  } catch (error) {
    console.error('Get like count error:', error);
    res.status(500).json({ error: 'Failed to get like count' });
  }
});

// GET /api/social/like/my-content - Get user's liked content
router.get('/like/my-content', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type } = req.query; // Optional: filter by type

    const likes = { songs: [], albums: [] };

    const types = type ? [type] : ['song', 'album'];

    for (const contentType of types) {
      const result = await dynamoClient.send(new QueryCommand({
        TableName: LIKES_TABLE,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': `LIKE#${userId}#${contentType}`
        }
      }));

      const items = (result.Items || []).map(item => ({
        id: item.item_id,
        name: item.item_name,
        liked_at: item.liked_at
      }));

      if (contentType === 'song') {
        likes.songs = items;
      } else {
        likes.albums = items;
      }
    }

    res.json(likes);
  } catch (error) {
    console.error('Get my liked content error:', error);
    res.status(500).json({ error: 'Failed to get liked content' });
  }
});

// ============================================
// CONTENT COMMENTS (Songs & Albums)
// ============================================

// POST /api/social/comment/:type/:id - Add comment
router.post('/comment/:type/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, id } = req.params;
    const { text } = req.body;
    const itemId = Number(id);

    if (!['song', 'album'].includes(type)) {
      return res.status(400).json({ error: 'Type must be song or album' });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text required' });
    }

    if (text.length > 500) {
      return res.status(400).json({ error: 'Comment too long (max 500 characters)' });
    }

    const commentId = uuidv4();
    const timestamp = Date.now();

    await dynamoClient.send(new PutCommand({
      TableName: COMMENTS_TABLE,
      Item: {
        PK: `ITEM#${type}#${itemId}`,
        SK: `COMMENT#${timestamp}#${commentId}`,
        GSI1PK: `USER#${userId}`,
        GSI1SK: `COMMENT#${timestamp}`,
        comment_id: commentId,
        user_id: userId,
        user_name: req.user.name || req.user.email,
        user_email: req.user.email,
        item_id: itemId,
        item_type: type,
        text: text.trim(),
        created_at: timestamp,
        updated_at: timestamp
      }
    }));

    res.json({
      success: true,
      comment: {
        comment_id: commentId,
        user_name: req.user.name || req.user.email,
        text: text.trim(),
        created_at: timestamp
      }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// GET /api/social/comment/:type/:id - Get comments for item
router.get('/comment/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params;
    const itemId = Number(id);
    const { limit = 50, lastKey } = req.query;

    const params = {
      TableName: COMMENTS_TABLE,
      KeyConditionExpression: 'PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `ITEM#${type}#${itemId}`
      },
      Limit: parseInt(limit),
      ScanIndexForward: false // Most recent first
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
    }

    const result = await dynamoClient.send(new QueryCommand(params));

    const comments = (result.Items || []).map(item => ({
      comment_id: item.comment_id,
      user_id: item.user_id,
      user_name: item.user_name,
      text: item.text,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));

    res.json({
      comments,
      lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
      count: comments.length
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

// DELETE /api/social/comment/:type/:id/:commentId - Delete own comment
router.delete('/comment/:type/:id/:commentId', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { type, id, commentId } = req.params;
    const itemId = Number(id);

    // Find the comment to verify ownership
    const result = await dynamoClient.send(new QueryCommand({
      TableName: COMMENTS_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `ITEM#${type}#${itemId}`,
        ':sk': 'COMMENT#'
      },
      FilterExpression: 'comment_id = :cid',
      ExpressionAttributeValues: {
        ...{':pk': `ITEM#${type}#${itemId}`, ':sk': 'COMMENT#'},
        ':cid': commentId
      }
    }));

    const comment = result.Items?.[0];
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Verify ownership
    if (comment.user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    // Delete comment
    await dynamoClient.send(new DeleteCommand({
      TableName: COMMENTS_TABLE,
      Key: {
        PK: comment.PK,
        SK: comment.SK
      }
    }));

    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// GET /api/social/comment/my-comments - Get user's comments
router.get('/comment/my-comments', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { limit = 50 } = req.query;

    const result = await dynamoClient.send(new QueryCommand({
      TableName: COMMENTS_TABLE,
      IndexName: 'UserCommentsIndex',
      KeyConditionExpression: 'GSI1PK = :pk',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`
      },
      Limit: parseInt(limit),
      ScanIndexForward: false
    }));

    const comments = (result.Items || []).map(item => ({
      comment_id: item.comment_id,
      item_id: item.item_id,
      item_type: item.item_type,
      text: item.text,
      created_at: item.created_at
    }));

    res.json({ comments });
  } catch (error) {
    console.error('Get my comments error:', error);
    res.status(500).json({ error: 'Failed to get comments' });
  }
});

module.exports = router;
