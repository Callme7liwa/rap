const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const USER_PROFILES_TABLE = process.env.USER_PROFILES_TABLE || 'lyricscape-user-profiles-prod';

// ============================================
// GET /api/user/profile - Get current user profile
// ============================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Try to get profile from DynamoDB
    const result = await dynamoClient.send(new GetCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: userId }
    }));

    if (result.Item) {
      // Profile exists in database
      res.json({
        success: true,
        profile: {
          user_id: result.Item.user_id,
          email: req.user.email, // From Cognito token (read-only)
          display_name: result.Item.display_name,
          profile_picture: result.Item.profile_picture,
          bio: result.Item.bio || '',
          created_at: result.Item.created_at,
          updated_at: result.Item.updated_at
        }
      });
    } else {
      // No profile yet - return default from Cognito token
      res.json({
        success: true,
        profile: {
          user_id: userId,
          email: req.user.email,
          display_name: req.user.name || req.user.email?.split('@')[0] || 'User',
          profile_picture: '',
          bio: '',
          created_at: Date.now(),
          updated_at: Date.now()
        }
      });
    }
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile', details: error.message });
  }
});

// ============================================
// PUT /api/user/profile - Update user profile
// ============================================
router.put('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { display_name, profile_picture, bio } = req.body;
    
    if (!display_name || display_name.trim() === '') {
      return res.status(400).json({ error: 'Display name is required' });
    }

    const timestamp = Date.now();

    // Check if profile exists
    const existingProfile = await dynamoClient.send(new GetCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: userId }
    }));

    if (existingProfile.Item) {
      // Update existing profile
      await dynamoClient.send(new UpdateCommand({
        TableName: USER_PROFILES_TABLE,
        Key: { user_id: userId },
        UpdateExpression: 'SET display_name = :name, profile_picture = :picture, bio = :bio, updated_at = :updated',
        ExpressionAttributeValues: {
          ':name': display_name.trim(),
          ':picture': profile_picture || '',
          ':bio': bio || '',
          ':updated': timestamp
        }
      }));
    } else {
      // Create new profile
      await dynamoClient.send(new PutCommand({
        TableName: USER_PROFILES_TABLE,
        Item: {
          user_id: userId,
          display_name: display_name.trim(),
          profile_picture: profile_picture || '',
          bio: bio || '',
          created_at: timestamp,
          updated_at: timestamp
        }
      }));
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        user_id: userId,
        email: req.user.email,
        display_name: display_name.trim(),
        profile_picture: profile_picture || '',
        bio: bio || '',
        updated_at: timestamp
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      error: 'Failed to update profile', 
      details: error.message 
    });
  }
});

// ============================================
// GET /api/user/profile/:userId - Get any user's public profile
// ============================================
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await dynamoClient.send(new GetCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: userId }
    }));

    if (result.Item) {
      res.json({
        success: true,
        profile: {
          user_id: result.Item.user_id,
          display_name: result.Item.display_name,
          profile_picture: result.Item.profile_picture,
          bio: result.Item.bio || '',
          created_at: result.Item.created_at
        }
      });
    } else {
      res.json({
        success: true,
        profile: {
          user_id: userId,
          display_name: 'User',
          profile_picture: '',
          bio: ''
        }
      });
    }
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ error: 'Failed to get user profile', details: error.message });
  }
});

module.exports = router;
