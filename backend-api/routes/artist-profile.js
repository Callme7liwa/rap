const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';

// ============================================
// GET /api/artist-profile/me - Get current user's artist profile
// ============================================
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Find artist association for this user using Scan (no index available)
    const result = await dynamoClient.send(new ScanCommand({
      TableName: ARTIST_USERS_TABLE,
      FilterExpression: 'user_id = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'No artist profile associated with this user' });
    }

    const association = result.Items[0];

    // Get full artist details
    const artistResult = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: association.artist_id }
    }));

    if (!artistResult.Item) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json({
      artist: artistResult.Item,
      association: {
        associated_at: association.associated_at,
        artist_id: association.artist_id
      }
    });
  } catch (error) {
    console.error('Error fetching artist profile:', error);
    res.status(500).json({ error: 'Failed to fetch artist profile', details: error.message });
  }
});

// ============================================
// PUT /api/artist-profile/me - Update artist profile
// ============================================
router.put('/me', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const {
      name,
      description,
      description_preview,
      description_html,
      description_markdown,
      image_url,
      header_image_url,
      instagram_name,
      twitter_name,
      facebook_name
    } = req.body;

    // Find artist association
    const associationResult = await dynamoClient.send(new QueryCommand({
      TableName: ARTIST_USERS_TABLE,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }));

    if (!associationResult.Items || associationResult.Items.length === 0) {
      return res.status(403).json({ error: 'You are not associated with any artist profile' });
    }

    const artistId = associationResult.Items[0].artist_id;

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
    }

    // Handle description field (maps to description_preview)
    if (description !== undefined) {
      updateExpressions.push('description_preview = :desc');
      expressionAttributeValues[':desc'] = description;
    }

    if (description_preview !== undefined) {
      updateExpressions.push('description_preview = :desc_prev');
      expressionAttributeValues[':desc_prev'] = description_preview;
    }

    if (description_html !== undefined) {
      updateExpressions.push('description_html = :desc_html');
      expressionAttributeValues[':desc_html'] = description_html;
    }

    if (description_markdown !== undefined) {
      updateExpressions.push('description_markdown = :desc_md');
      expressionAttributeValues[':desc_md'] = description_markdown;
    }

    if (image_url !== undefined) {
      updateExpressions.push('image_url = :img');
      expressionAttributeValues[':img'] = image_url;
    }

    if (header_image_url !== undefined) {
      updateExpressions.push('header_image_url = :header');
      expressionAttributeValues[':header'] = header_image_url;
    }

    if (instagram_name !== undefined) {
      updateExpressions.push('instagram_name = :ig');
      expressionAttributeValues[':ig'] = instagram_name;
    }

    if (twitter_name !== undefined) {
      updateExpressions.push('twitter_name = :tw');
      expressionAttributeValues[':tw'] = twitter_name;
    }

    if (facebook_name !== undefined) {
      updateExpressions.push('facebook_name = :fb');
      expressionAttributeValues[':fb'] = facebook_name;
    }

    if (updateExpressions.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add last updated timestamp
    updateExpressions.push('last_updated = :updated');
    expressionAttributeValues[':updated'] = Date.now();

    // Update artist profile
    await dynamoClient.send(new UpdateCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: artistId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    // Get updated artist
    const updatedArtist = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: artistId }
    }));

    res.json({
      success: true,
      message: 'Artist profile updated successfully',
      artist: updatedArtist.Item
    });
  } catch (error) {
    console.error('Error updating artist profile:', error);
    res.status(500).json({ error: 'Failed to update artist profile', details: error.message });
  }
});

module.exports = router;
