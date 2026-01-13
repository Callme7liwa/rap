/**
 * Collaboration Requests Table Schema
 * 
 * Table: lyricscape-collab-requests-prod
 * 
 * Primary Key: id (Number)
 * GSI1: artist_id-status-index (artist_id, status)
 * GSI2: requester_id-created_at-index (requester_id, created_at)
 * 
 * Fields:
 * - id: unique request ID
 * - requester_id: Cognito user ID who made the request
 * - requester_name: Display name
 * - requester_email: Contact email
 * - artist_id: Target artist ID
 * - artist_name: Target artist name
 * - collaboration_type: 'song' | 'album'
 * - message: Request message (max 500 chars)
 * - status: 'pending' | 'approved' | 'rejected' | 'completed'
 * - created_at: Timestamp
 * - updated_at: Timestamp
 * - responded_at: Timestamp when artist responded
 * - response_message: Artist's response
 */

const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  UpdateCommand,
  QueryCommand,
  ScanCommand 
} = require('@aws-sdk/lib-dynamodb');
const { verifyToken, requireAdmin } = require('../middleware/auth');
const { checkArtistPermissions } = require('../middleware/artist-ownership');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const COLLAB_REQUESTS_TABLE = 'lyricscape-collab-requests-prod';
const ARTISTS_TABLE = 'lyricscape-artists-prod';
const USER_PROFILES_TABLE = 'lyricscape-user-profiles-prod';
const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';
const SETTINGS_TABLE = 'lyricscape-settings-prod';

// Default rate limiting (can be overridden by admin settings)
const DEFAULT_MAX_REQUESTS_PER_MONTH = 2;

/**
 * Get the current collaboration request limit from admin settings
 * Falls back to default if no setting exists
 */
async function getCollabRequestLimit() {
  try {
    const result = await dynamoClient.send(new GetCommand({
      TableName: SETTINGS_TABLE,
      Key: { setting_key: 'collab_request_limit' }
    }));

    if (result.Item && result.Item.setting_value) {
      return parseInt(result.Item.setting_value);
    }
  } catch (error) {
    console.log('Using default collab request limit:', error.message);
  }
  
  return DEFAULT_MAX_REQUESTS_PER_MONTH;
}

/**
 * Get user display information (check if they're an artist first, then check user profile)
 */
async function getUserDisplayInfo(userId) {
  try {
    // First, check if user is associated with an artist
    const artistAssocResult = await dynamoClient.send(new ScanCommand({
      TableName: ARTIST_USERS_TABLE,
      FilterExpression: 'user_id = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }));

    if (artistAssocResult.Items && artistAssocResult.Items.length > 0) {
      const artistId = artistAssocResult.Items[0].artist_id;
      
      // Get artist details
      const artistResult = await dynamoClient.send(new GetCommand({
        TableName: ARTISTS_TABLE,
        Key: { id: artistId }
      }));

      if (artistResult.Item) {
        return {
          displayName: artistResult.Item.name,
          isArtist: true,
          artistId: artistId
        };
      }
    }

    // If not an artist, check user profile table
    const userProfileResult = await dynamoClient.send(new GetCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { user_id: userId }
    }));

    if (userProfileResult.Item && userProfileResult.Item.display_name) {
      return {
        displayName: userProfileResult.Item.display_name,
        isArtist: false,
        artistId: null
      };
    }

    // Fallback to username (passed in separately)
    return {
      displayName: null, // Will use username as fallback
      isArtist: false,
      artistId: null
    };
  } catch (error) {
    console.error('Error getting user display info:', error);
    return {
      displayName: null,
      isArtist: false,
      artistId: null
    };
  }
}

/**
 * Check if user has exceeded monthly request limit
 * Only applies to non-artist users (fans)
 * Artists can request unlimited collaborations
 */
async function checkMonthlyLimit(userId) {
  // Check if user is associated with an artist
  const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';
  const artistAssocResult = await dynamoClient.send(new ScanCommand({
    TableName: ARTIST_USERS_TABLE,
    FilterExpression: 'user_id = :uid',
    ExpressionAttributeValues: {
      ':uid': userId
    }
  }));

  const isArtist = artistAssocResult.Items && artistAssocResult.Items.length > 0;

  // Artists have no limit
  if (isArtist) {
    return {
      count: 0,
      limit: 'unlimited',
      remaining: 'unlimited',
      canRequest: true,
      resetDate: null,
      isArtist: true
    };
  }

  // For fans/regular users, enforce monthly limit
  const MAX_REQUESTS_PER_MONTH = await getCollabRequestLimit();
  
  const now = Date.now();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const monthStartTimestamp = monthStart.getTime();

  // Query user's requests this month
  const result = await dynamoClient.send(new ScanCommand({
    TableName: COLLAB_REQUESTS_TABLE,
    FilterExpression: 'requester_id = :uid AND created_at >= :monthStart',
    ExpressionAttributeValues: {
      ':uid': userId,
      ':monthStart': monthStartTimestamp
    }
  }));

  return {
    count: result.Items?.length || 0,
    limit: MAX_REQUESTS_PER_MONTH,
    remaining: MAX_REQUESTS_PER_MONTH - (result.Items?.length || 0),
    canRequest: (result.Items?.length || 0) < MAX_REQUESTS_PER_MONTH,
    resetDate: new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1),
    isArtist: false
  };
}

/**
 * Get next available ID
 */
async function getNextId() {
  const result = await dynamoClient.send(new ScanCommand({
    TableName: COLLAB_REQUESTS_TABLE,
    ProjectionExpression: 'id'
  }));

  const maxId = result.Items?.reduce((max, item) => Math.max(max, item.id || 0), 0) || 0;
  return maxId + 1;
}

// ============================================
// POST /api/collab-requests - Create new collaboration request
// ============================================
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const username = req.user.username;
    const email = req.user.email;
    const {
      artist_id,
      collaborator_artist_id, // NEW: Second artist for user-requested collaborations
      collaboration_type,
      message
    } = req.body;

    // Validation
    if (!artist_id || !collaboration_type || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: artist_id, collaboration_type, message' 
      });
    }

    if (!['song', 'album'].includes(collaboration_type)) {
      return res.status(400).json({ 
        error: 'collaboration_type must be "song" or "album"' 
      });
    }

    if (message.length > 500) {
      return res.status(400).json({ 
        error: 'Message must be 500 characters or less' 
      });
    }

    // Check monthly limit (only for non-artist users)
    const limitCheck = await checkMonthlyLimit(userId);
    if (!limitCheck.canRequest) {
      return res.status(429).json({ 
        error: 'Monthly limit reached',
        message: limitCheck.isArtist 
          ? 'Artists have unlimited collaboration requests'
          : `You can only make ${MAX_REQUESTS_PER_MONTH} collaboration requests per month`,
        limit: limitCheck.limit,
        count: limitCheck.count,
        resetDate: limitCheck.resetDate,
        isArtist: limitCheck.isArtist
      });
    }

    // Get artist details
    const artistResult = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: artist_id }
    }));

    if (!artistResult.Item) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    const artist = artistResult.Item;

    // Get collaborator artist details if provided (for regular users requesting between artists)
    let collaboratorArtist = null;
    if (collaborator_artist_id) {
      const collaboratorResult = await dynamoClient.send(new GetCommand({
        TableName: ARTISTS_TABLE,
        Key: { id: collaborator_artist_id }
      }));

      if (!collaboratorResult.Item) {
        return res.status(404).json({ error: 'Collaborator artist not found' });
      }

      collaboratorArtist = collaboratorResult.Item;
    }

    // Get requester display information (artist name or user display name)
    const requesterInfo = await getUserDisplayInfo(userId);
    const displayName = requesterInfo.displayName || username; // Fallback to username if no display name

    // Create request(s)
    const requestId = await getNextId();
    const now = Date.now();

    // If this is a fan-requested collaboration (has collaborator_artist_id),
    // we need to create TWO linked requests - one for each artist
    if (collaborator_artist_id) {
      const secondRequestId = requestId + 1;

      // Request for Artist 1
      const collabRequest1 = {
        id: requestId,
        requester_id: userId,
        requester_name: displayName,
        requester_email: email,
        requester_is_artist: requesterInfo.isArtist,
        requester_artist_id: requesterInfo.artistId,
        artist_id,
        artist_name: artist.name,
        collaborator_artist_id: collaborator_artist_id,
        collaborator_artist_name: collaboratorArtist.name,
        collaboration_type,
        message: message.trim(),
        status: 'pending',
        linked_request_id: secondRequestId, // Link to the paired request
        created_at: now,
        updated_at: now
      };

      // Request for Artist 2 (collaborator)
      const collabRequest2 = {
        id: secondRequestId,
        requester_id: userId,
        requester_name: displayName,
        requester_email: email,
        requester_is_artist: requesterInfo.isArtist,
        requester_artist_id: requesterInfo.artistId,
        artist_id: collaborator_artist_id,
        artist_name: collaboratorArtist.name,
        collaborator_artist_id: artist_id,
        collaborator_artist_name: artist.name,
        collaboration_type,
        message: message.trim(),
        status: 'pending',
        linked_request_id: requestId, // Link to the paired request
        created_at: now,
        updated_at: now
      };

      // Save both requests
      await dynamoClient.send(new PutCommand({
        TableName: COLLAB_REQUESTS_TABLE,
        Item: collabRequest1
      }));

      await dynamoClient.send(new PutCommand({
        TableName: COLLAB_REQUESTS_TABLE,
        Item: collabRequest2
      }));

      res.status(201).json({
        success: true,
        message: 'Collaboration request submitted successfully to both artists',
        requests: [collabRequest1, collabRequest2],
        remaining: limitCheck.remaining - 1
      });
    } else {
      // Regular artist-to-artist request (only one request)
      const collabRequest = {
        id: requestId,
        requester_id: userId,
        requester_name: displayName,
        requester_email: email,
        requester_is_artist: requesterInfo.isArtist,
        requester_artist_id: requesterInfo.artistId,
        artist_id,
        artist_name: artist.name,
        collaborator_artist_id: null,
        collaborator_artist_name: null,
        collaboration_type,
        message: message.trim(),
        status: 'pending',
        linked_request_id: null,
        created_at: now,
        updated_at: now
      };

      await dynamoClient.send(new PutCommand({
        TableName: COLLAB_REQUESTS_TABLE,
        Item: collabRequest
      }));

      res.status(201).json({
        success: true,
        message: 'Collaboration request submitted successfully',
        request: collabRequest,
        remaining: limitCheck.remaining - 1
      });
    }
  } catch (error) {
    console.error('Error creating collaboration request:', error);
    res.status(500).json({ error: 'Failed to create collaboration request' });
  }
});

// ============================================
// GET /api/collab-requests/my-requests - Get user's own requests
// ============================================
router.get('/my-requests', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    const result = await dynamoClient.send(new ScanCommand({
      TableName: COLLAB_REQUESTS_TABLE,
      FilterExpression: 'requester_id = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }));

    const requests = (result.Items || []).sort((a, b) => b.created_at - a.created_at);

    // Get monthly limit info
    const limitCheck = await checkMonthlyLimit(userId);

    res.json({
      requests,
      limit: limitCheck
    });
  } catch (error) {
    console.error('Error fetching user requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ============================================
// GET /api/collab-requests/for-artist - Get requests for owned artist
// ============================================
router.get('/for-artist', verifyToken, checkArtistPermissions, async (req, res) => {
  try {
    const artistId = req.userArtistId; // Changed from req.artistId to req.userArtistId

    if (!artistId) {
      return res.status(403).json({ 
        error: 'You must be associated with an artist to view requests',
        message: 'Only users associated with an artist profile can view collaboration requests.'
      });
    }

    const result = await dynamoClient.send(new ScanCommand({
      TableName: COLLAB_REQUESTS_TABLE,
      FilterExpression: 'artist_id = :aid OR collaborator_artist_id = :aid',
      ExpressionAttributeValues: {
        ':aid': artistId
      }
    }));

    let requests = (result.Items || []).sort((a, b) => b.created_at - a.created_at);

    // Enrich requests with approval_status for partially_approved linked requests
    requests = await Promise.all(requests.map(async (request) => {
      if (request.status === 'partially_approved' && request.linked_request_id) {
        // Fetch the linked request to check its status
        const linkedResult = await dynamoClient.send(new GetCommand({
          TableName: COLLAB_REQUESTS_TABLE,
          Key: { id: request.linked_request_id }
        }));

        const linkedRequest = linkedResult.Item;

        if (linkedRequest && request.collaborator_artist_id) {
          // Determine which artist approved based on the status
          const artist1Approved = request.status === 'partially_approved' || request.status === 'approved';
          const artist2Approved = linkedRequest.status === 'partially_approved' || linkedRequest.status === 'approved';

          request.approval_status = {
            artist_1_approved: artist1Approved,
            artist_2_approved: artist2Approved,
            artist_1_id: request.artist_id,
            artist_2_id: request.collaborator_artist_id
          };
        }
      }
      return request;
    }));

    // Group by status
    const grouped = {
      pending: requests.filter(r => r.status === 'pending'),
      partially_approved: requests.filter(r => r.status === 'partially_approved'),
      approved: requests.filter(r => r.status === 'approved'),
      rejected: requests.filter(r => r.status === 'rejected'),
      completed: requests.filter(r => r.status === 'completed')
    };

    res.json({
      requests,
      grouped,
      counts: {
        total: requests.length,
        pending: grouped.pending.length,
        partially_approved: grouped.partially_approved.length,
        approved: grouped.approved.length,
        rejected: grouped.rejected.length,
        completed: grouped.completed.length
      }
    });
  } catch (error) {
    console.error('Error fetching artist requests:', error);
    res.status(500).json({ error: 'Failed to fetch requests' });
  }
});

// ============================================
// PUT /api/collab-requests/:id/respond - Artist responds to request
// ============================================
router.put('/:id/respond', verifyToken, checkArtistPermissions, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const artistId = req.userArtistId;
    const { status, response_message } = req.body;

    if (!artistId) {
      return res.status(403).json({ 
        error: 'You must be associated with an artist to respond to requests',
        message: 'Only users associated with an artist profile can respond to collaboration requests.'
      });
    }

    if (!['approved', 'rejected', 'completed'].includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be: approved, rejected, or completed' 
      });
    }

    // Get request
    const requestResult = await dynamoClient.send(new GetCommand({
      TableName: COLLAB_REQUESTS_TABLE,
      Key: { id: requestId }
    }));

    if (!requestResult.Item) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.Item;

    // Verify ownership - artist can be either the primary artist OR the collaborator artist
    const isOwner = request.artist_id === artistId || request.collaborator_artist_id === artistId;
    
    if (!isOwner && !req.isAdmin) {
      return res.status(403).json({ 
        error: 'You can only respond to requests for your own artist profile' 
      });
    }

    const now = Date.now();

    // Check if this request has a linked request (fan-requested collaboration)
    if (request.linked_request_id) {
      // Get the linked request
      const linkedResult = await dynamoClient.send(new GetCommand({
        TableName: COLLAB_REQUESTS_TABLE,
        Key: { id: request.linked_request_id }
      }));

      const linkedRequest = linkedResult.Item;

      // Handle approval logic for linked requests
      if (status === 'approved') {
        // Check if the other artist has already approved
        if (linkedRequest && linkedRequest.status === 'partially_approved') {
          // Both approved! Mark both as fully approved
          await dynamoClient.send(new UpdateCommand({
            TableName: COLLAB_REQUESTS_TABLE,
            Key: { id: requestId },
            UpdateExpression: 'SET #status = :status, updated_at = :updated, responded_at = :responded, response_message = :response',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': 'approved',
              ':updated': now,
              ':responded': now,
              ':response': response_message || 'Both artists have approved this collaboration!'
            }
          }));

          await dynamoClient.send(new UpdateCommand({
            TableName: COLLAB_REQUESTS_TABLE,
            Key: { id: request.linked_request_id },
            UpdateExpression: 'SET #status = :status, updated_at = :updated, response_message = :response',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': 'approved',
              ':updated': now,
              ':response': 'Both artists have approved this collaboration!'
            }
          }));

          return res.json({
            success: true,
            message: 'Both artists have approved! Collaboration is ready to start.',
            request: { ...request, status: 'approved' },
            bothApproved: true
          });
        } else {
          // First approval - mark as partially_approved
          await dynamoClient.send(new UpdateCommand({
            TableName: COLLAB_REQUESTS_TABLE,
            Key: { id: requestId },
            UpdateExpression: 'SET #status = :status, updated_at = :updated, responded_at = :responded, response_message = :response',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': 'partially_approved',
              ':updated': now,
              ':responded': now,
              ':response': response_message || 'Approved! Waiting for the other artist to respond.'
            }
          }));

          return res.json({
            success: true,
            message: 'You have approved! Waiting for the other artist to respond.',
            request: { ...request, status: 'partially_approved' },
            waitingForOther: true
          });
        }
      } else if (status === 'rejected') {
        // If one artist rejects, both requests are rejected
        await dynamoClient.send(new UpdateCommand({
          TableName: COLLAB_REQUESTS_TABLE,
          Key: { id: requestId },
          UpdateExpression: 'SET #status = :status, updated_at = :updated, responded_at = :responded, response_message = :response',
          ExpressionAttributeNames: { '#status': 'status' },
          ExpressionAttributeValues: {
            ':status': 'rejected',
            ':updated': now,
            ':responded': now,
            ':response': response_message || 'Collaboration declined'
          }
        }));

        if (linkedRequest) {
          await dynamoClient.send(new UpdateCommand({
            TableName: COLLAB_REQUESTS_TABLE,
            Key: { id: request.linked_request_id },
            UpdateExpression: 'SET #status = :status, updated_at = :updated, response_message = :rejectionMsg',
            ExpressionAttributeNames: { '#status': 'status' },
            ExpressionAttributeValues: {
              ':status': 'rejected',
              ':updated': now,
              ':rejectionMsg': 'The other artist declined this collaboration'
            }
          }));
        }

        return res.json({
          success: true,
          message: 'Collaboration declined',
          request: { ...request, status: 'rejected' }
        });
      }
    }

    // Regular request (no linked request) - update normally
    await dynamoClient.send(new UpdateCommand({
      TableName: COLLAB_REQUESTS_TABLE,
      Key: { id: requestId },
      UpdateExpression: 'SET #status = :status, updated_at = :updated, responded_at = :responded, response_message = :response',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updated': now,
        ':responded': now,
        ':response': response_message || ''
      }
    }));

    res.json({
      success: true,
      message: 'Response submitted successfully',
      request: {
        ...request,
        status,
        response_message,
        responded_at: now,
        updated_at: now
      }
    });
  } catch (error) {
    console.error('Error responding to request:', error);
    res.status(500).json({ error: 'Failed to respond to request' });
  }
});

// ============================================
// GET /api/collab-requests/limit-check - Check monthly limit
// ============================================
router.get('/limit-check', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const limitCheck = await checkMonthlyLimit(userId);
    res.json(limitCheck);
  } catch (error) {
    console.error('Error checking limit:', error);
    res.status(500).json({ error: 'Failed to check limit' });
  }
});

// ============================================
// GET /api/collab-requests/:id - Get single request
// ============================================
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const userId = req.user.sub;

    const result = await dynamoClient.send(new GetCommand({
      TableName: COLLAB_REQUESTS_TABLE,
      Key: { id: requestId }
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = result.Item;

    // Only requester or artist can view
    const artistId = req.artistId;
    if (request.requester_id !== userId && request.artist_id !== artistId && !req.isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching request:', error);
    res.status(500).json({ error: 'Failed to fetch request' });
  }
});

// ============================================
// DELETE /api/collab-requests/:id - Cancel request (requester only)
// ============================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const requestId = Number(req.params.id);
    const userId = req.user.sub;

    const result = await dynamoClient.send(new GetCommand({
      TableName: COLLAB_REQUESTS_TABLE,
      Key: { id: requestId }
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = result.Item;

    // Only requester or admin can delete
    if (request.requester_id !== userId && !req.isAdmin) {
      return res.status(403).json({ error: 'You can only cancel your own requests' });
    }

    // Can only cancel pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({ 
        error: 'Cannot cancel request',
        message: 'You can only cancel pending requests' 
      });
    }

    // Update to cancelled status instead of deleting
    await dynamoClient.send(new UpdateCommand({
      TableName: COLLAB_REQUESTS_TABLE,
      Key: { id: requestId },
      UpdateExpression: 'SET #status = :status, updated_at = :updated',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': 'cancelled',
        ':updated': Date.now()
      }
    }));

    res.json({
      success: true,
      message: 'Request cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling request:', error);
    res.status(500).json({ error: 'Failed to cancel request' });
  }
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// GET /api/collab-requests/admin/settings - Get collaboration request limit
router.get('/admin/settings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const limit = await getCollabRequestLimit();
    
    res.json({
      collab_request_limit: limit,
      default_limit: DEFAULT_MAX_REQUESTS_PER_MONTH
    });
  } catch (error) {
    console.error('Error fetching collab request settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/collab-requests/admin/settings - Update collaboration request limit
router.put('/admin/settings', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { collab_request_limit } = req.body;

    // Validation
    if (!collab_request_limit || isNaN(collab_request_limit) || collab_request_limit < 1) {
      return res.status(400).json({ 
        error: 'Invalid limit',
        message: 'Collaboration request limit must be a positive number'
      });
    }

    const limit = parseInt(collab_request_limit);

    // Update or create setting
    await dynamoClient.send(new PutCommand({
      TableName: SETTINGS_TABLE,
      Item: {
        setting_key: 'collab_request_limit',
        setting_value: limit.toString(),
        updated_at: Date.now(),
        updated_by: req.user.sub
      }
    }));

    res.json({
      success: true,
      message: 'Collaboration request limit updated successfully',
      collab_request_limit: limit
    });
  } catch (error) {
    console.error('Error updating collab request settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;

