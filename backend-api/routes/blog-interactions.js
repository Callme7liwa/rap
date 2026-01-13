const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, DeleteCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const BLOG_POSTS_TABLE = process.env.BLOG_POSTS_TABLE || 'lyricscape-blog-posts-prod';
const BLOG_COMMENTS_TABLE = process.env.BLOG_COMMENTS_TABLE || 'lyricscape-blog-comments-prod';
const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || 'lyricscape-user-profiles-prod';

// ============================================
// POST /api/blog/:slug/like - Like/Unlike a blog post
// ============================================
router.post('/:slug/like', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { slug } = req.params;

    // Get the post
    const postResult = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_POSTS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    if (!postResult.Items || postResult.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.Items[0];

    // Check if user already liked
    const likedBy = post.liked_by || {};
    const hasLiked = !!likedBy[userId];

    if (hasLiked) {
      // Unlike
      delete likedBy[userId];

      await dynamoClient.send(new UpdateCommand({
        TableName: BLOG_POSTS_TABLE,
        Key: { post_id: post.post_id, created_at: post.created_at },
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
        likes: (post.likes || 0) - 1
      });
    } else {
      // Like
      likedBy[userId] = Date.now();

      await dynamoClient.send(new UpdateCommand({
        TableName: BLOG_POSTS_TABLE,
        Key: { post_id: post.post_id, created_at: post.created_at },
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
        likes: (post.likes || 0) + 1
      });
    }
  } catch (error) {
    console.error('Like post error:', error);
    res.status(500).json({ error: 'Failed to like post', details: error.message });
  }
});

// ============================================
// POST /api/blog/:slug/comment - Add comment to blog post
// ============================================
router.post('/:slug/comment', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const userEmail = req.user.email || 'Anonymous';
    const { slug } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Get user profile from profiles table
    let userName = 'User';
    let userPicture = '';
    
    try {
      const profileResult = await dynamoClient.send(new GetCommand({
        TableName: USER_PROFILES_TABLE,
        Key: { user_id: userId }
      }));
      
      if (profileResult.Item) {
        userName = profileResult.Item.display_name || 'User';
        userPicture = profileResult.Item.profile_picture || '';
      } else {
        // Fallback to token data if no profile exists
        userName = req.user.name || userEmail?.split('@')[0] || 'User';
      }
    } catch (profileError) {
      console.warn('Could not fetch user profile, using defaults:', profileError);
      userName = req.user.name || userEmail?.split('@')[0] || 'User';
    }

    // Get the post
    const postResult = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_POSTS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    if (!postResult.Items || postResult.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.Items[0];
    const commentId = uuidv4();
    const timestamp = Date.now();

    const comment = {
      comment_id: commentId,
      post_id: post.post_id,
      post_slug: slug,
      user_id: userId,
      user_email: userEmail,
      user_name: userName,
      user_picture: userPicture,
      content: content.trim(),
      created_at: timestamp,
      updated_at: timestamp
    };

    await dynamoClient.send(new PutCommand({
      TableName: BLOG_COMMENTS_TABLE,
      Item: comment
    }));

    // Update comment count on post
    await dynamoClient.send(new UpdateCommand({
      TableName: BLOG_POSTS_TABLE,
      Key: { post_id: post.post_id, created_at: post.created_at },
      UpdateExpression: 'SET comments = if_not_exists(comments, :zero) + :inc',
      ExpressionAttributeValues: {
        ':zero': 0,
        ':inc': 1
      }
    }));

    res.json({
      success: true,
      comment
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Failed to add comment', details: error.message });
  }
});

// ============================================
// GET /api/blog/:slug/comments - Get comments for a post
// ============================================
router.get('/:slug/comments', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_COMMENTS_TABLE,
      IndexName: 'PostSlugIndex',
      KeyConditionExpression: 'post_slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    let comments = (result.Items || []).sort((a, b) => b.created_at - a.created_at);

    // Enrich comments with latest user profile data
    comments = await Promise.all(comments.map(async (comment) => {
      try {
        const profileResult = await dynamoClient.send(new GetCommand({
          TableName: USER_PROFILES_TABLE,
          Key: { user_id: comment.user_id }
        }));

        if (profileResult.Item) {
          // Use latest profile data
          return {
            ...comment,
            user_name: profileResult.Item.display_name,
            user_picture: profileResult.Item.profile_picture || ''
          };
        }
      } catch (error) {
        console.warn('Could not fetch profile for user:', comment.user_id, error);
      }
      
      // Return comment with existing cached data
      return comment;
    }));

    res.json({ comments });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ error: 'Failed to get comments', details: error.message });
  }
});

// ============================================
// POST /api/blog/:slug/save - Save/Unsave a blog post
// ============================================
router.post('/:slug/save', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { slug } = req.params;

    // Get the post
    const postResult = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_POSTS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    if (!postResult.Items || postResult.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.Items[0];

    // Check if user already saved
    const savedBy = post.saved_by || {};
    const hasSaved = !!savedBy[userId];

    if (hasSaved) {
      // Unsave
      delete savedBy[userId];

      await dynamoClient.send(new UpdateCommand({
        TableName: BLOG_POSTS_TABLE,
        Key: { post_id: post.post_id, created_at: post.created_at },
        UpdateExpression: 'SET saved_by = :savedBy',
        ExpressionAttributeValues: {
          ':savedBy': savedBy
        }
      }));

      res.json({
        success: true,
        saved: false
      });
    } else {
      // Save
      savedBy[userId] = Date.now();

      await dynamoClient.send(new UpdateCommand({
        TableName: BLOG_POSTS_TABLE,
        Key: { post_id: post.post_id, created_at: post.created_at },
        UpdateExpression: 'SET saved_by = :savedBy',
        ExpressionAttributeValues: {
          ':savedBy': savedBy
        }
      }));

      res.json({
        success: true,
        saved: true
      });
    }
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ error: 'Failed to save post', details: error.message });
  }
});

// ============================================
// GET /api/blog/:slug/status - Get user's interaction status with a post
// ============================================
router.get('/:slug/status', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { slug } = req.params;

    // Get the post
    const postResult = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_POSTS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    if (!postResult.Items || postResult.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = postResult.Items[0];

    res.json({
      liked: !!(post.liked_by && post.liked_by[userId]),
      saved: !!(post.saved_by && post.saved_by[userId]),
      likes: post.likes || 0,
      comments: post.comments || 0
    });
  } catch (error) {
    console.error('Get post status error:', error);
    res.status(500).json({ error: 'Failed to get post status', details: error.message });
  }
});

module.exports = router;
