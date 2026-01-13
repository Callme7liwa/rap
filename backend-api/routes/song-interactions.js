const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  PutCommand, 
  QueryCommand, 
  DeleteCommand,
  GetCommand,
  UpdateCommand 
} = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const SONG_COMMENTS_TABLE = 'lyricscape-song-comments-prod';
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || 'lyricscape-user-profiles-prod';

// ============================================
// GET /api/songs/:id/comments - Get comments for a song
// ============================================
router.get('/:id/comments', async (req, res) => {
  try {
    const { id: songId } = req.params;

    const result = await dynamoClient.send(new QueryCommand({
      TableName: SONG_COMMENTS_TABLE,
      IndexName: 'SongIdIndex',
      KeyConditionExpression: 'song_id = :song_id',
      ExpressionAttributeValues: {
        ':song_id': songId
      },
      ScanIndexForward: false // Most recent first
    }));

    const comments = (result.Items || []).map(comment => ({
      id: comment.comment_id,
      songId: comment.song_id,
      userId: comment.user_id,
      userName: comment.user_name || 'User',
      userImage: comment.user_picture || '/placeholder.svg',
      content: comment.content,
      createdAt: comment.created_at,
      likes: comment.likes || 0
    }));

    res.json({ success: true, comments });
  } catch (error) {
    console.error('Get song comments error:', error);
    res.status(500).json({ error: 'Failed to get comments', details: error.message });
  }
});

// ============================================
// POST /api/songs/:id/comment - Add comment to a song
// ============================================
router.post('/:id/comment', verifyToken, async (req, res) => {
  try {
    const { id: songId } = req.params;
    const { content } = req.body;
    const userId = req.user.sub;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Get user profile for name and picture
    let userName = req.user.email?.split('@')[0] || 'User';
    let userPicture = '/placeholder.svg';

    try {
      const profileResult = await dynamoClient.send(new GetCommand({
        TableName: USER_PROFILES_TABLE,
        Key: { user_id: userId }
      }));

      if (profileResult.Item) {
        userName = profileResult.Item.display_name || userName;
        userPicture = profileResult.Item.profile_picture || userPicture;
      }
    } catch (error) {
      console.warn('Could not fetch user profile:', error.message);
    }

    const commentId = uuidv4();
    const timestamp = Date.now();

    const comment = {
      comment_id: commentId,
      song_id: songId,
      user_id: userId,
      user_name: userName,
      user_picture: userPicture,
      content: content.trim(),
      created_at: timestamp,
      updated_at: timestamp,
      likes: 0
    };

    await dynamoClient.send(new PutCommand({
      TableName: SONG_COMMENTS_TABLE,
      Item: comment
    }));

    res.status(201).json({
      success: true,
      comment: {
        id: commentId,
        songId,
        userId,
        userName,
        userImage: userPicture,
        content: content.trim(),
        createdAt: timestamp,
        likes: 0
      }
    });
  } catch (error) {
    console.error('Add song comment error:', error);
    res.status(500).json({ error: 'Failed to add comment', details: error.message });
  }
});

// ============================================
// DELETE /api/songs/:id/comment/:commentId - Delete own comment
// ============================================
router.delete('/:id/comment/:commentId', verifyToken, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.sub;

    // Get the comment to verify ownership
    const result = await dynamoClient.send(new QueryCommand({
      TableName: SONG_COMMENTS_TABLE,
      KeyConditionExpression: 'comment_id = :comment_id',
      ExpressionAttributeValues: {
        ':comment_id': commentId
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    const comment = result.Items[0];

    // Verify ownership
    if (comment.user_id !== userId) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    await dynamoClient.send(new DeleteCommand({
      TableName: SONG_COMMENTS_TABLE,
      Key: {
        comment_id: commentId,
        created_at: comment.created_at
      }
    }));

    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete song comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment', details: error.message });
  }
});

// ============================================
// POST /api/songs/:id/like - Like/unlike a song
// ============================================
router.post('/:id/like', verifyToken, async (req, res) => {
  try {
    const { id: songId } = req.params;
    const userId = req.user.sub;

    // Note: This assumes songs are stored in a DynamoDB table
    // You'll need to adjust based on your actual data source
    const SONGS_TABLE = 'lyricscape-songs-prod'; // Adjust as needed

    // Get current song data
    const songResult = await dynamoClient.send(new GetCommand({
      TableName: SONGS_TABLE,
      Key: { id: songId }
    }));

    if (!songResult.Item) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = songResult.Item;
    const likedBy = song.liked_by || {};
    const currentLikes = song.likes || 0;
    
    let newLikes;
    let isLiked;

    if (likedBy[userId]) {
      // Unlike
      delete likedBy[userId];
      newLikes = Math.max(0, currentLikes - 1);
      isLiked = false;
    } else {
      // Like
      likedBy[userId] = true;
      newLikes = currentLikes + 1;
      isLiked = true;
    }

    // Update song
    await dynamoClient.send(new UpdateCommand({
      TableName: SONGS_TABLE,
      Key: { id: songId },
      UpdateExpression: 'SET likes = :likes, liked_by = :liked_by',
      ExpressionAttributeValues: {
        ':likes': newLikes,
        ':liked_by': likedBy
      }
    }));

    res.json({
      success: true,
      isLiked,
      likes: newLikes
    });
  } catch (error) {
    console.error('Toggle song like error:', error);
    res.status(500).json({ error: 'Failed to toggle like', details: error.message });
  }
});

// ============================================
// GET /api/songs/:id/likes - Get users who liked a song
// ============================================
router.get('/:id/likes', async (req, res) => {
  try {
    const { id: songId } = req.params;
    const SONGS_TABLE = 'lyricscape-songs-prod'; // Adjust as needed

    const songResult = await dynamoClient.send(new GetCommand({
      TableName: SONGS_TABLE,
      Key: { id: songId }
    }));

    if (!songResult.Item) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const likedBy = songResult.Item.liked_by || {};
    const userIds = Object.keys(likedBy);

    // Fetch user profiles
    const users = [];
    for (const userId of userIds) {
      try {
        const profileResult = await dynamoClient.send(new GetCommand({
          TableName: USER_PROFILES_TABLE,
          Key: { user_id: userId }
        }));

        if (profileResult.Item) {
          users.push({
            userId: userId,
            userName: profileResult.Item.display_name || 'User',
            userImage: profileResult.Item.profile_picture || '/placeholder.svg'
          });
        }
      } catch (error) {
        console.warn(`Could not fetch profile for user ${userId}:`, error.message);
      }
    }

    res.json({ success: true, users, count: users.length });
  } catch (error) {
    console.error('Get song likes error:', error);
    res.status(500).json({ error: 'Failed to get likes', details: error.message });
  }
});

module.exports = router;
