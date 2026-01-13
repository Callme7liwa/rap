const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, DeleteCommand, ScanCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, ListUsersCommand, AdminListGroupsForUserCommand, AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminGetUserCommand, AdminDisableUserCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { verifyToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;

// Tables for merging
const VOTES_TABLE = 'lyricscape-votes-prod';
const ARTIST_FOLLOWS_TABLE = 'artist-follows-prod';
const CONTENT_LIKES_TABLE = 'content-likes-prod';
const CONTENT_COMMENTS_TABLE = 'content-comments-prod';
const USER_PROFILES_TABLE = 'lyricscape-user-profiles-prod';
const COLLAB_REQUESTS_TABLE = 'lyricscape-collab-requests-prod';

// ============================================
// GET /api/admin/artist-users - Get all artist-user associations
// ============================================
router.get('/artist-users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const result = await dynamoClient.send(new ScanCommand({
      TableName: ARTIST_USERS_TABLE,
    }));

    const associations = result.Items || [];

    // Fetch artist details for each association
    const associationsWithDetails = await Promise.all(
      associations.map(async (assoc) => {
        try {
          const artistResult = await dynamoClient.send(new GetCommand({
            TableName: ARTISTS_TABLE,
            Key: { id: assoc.artist_id }
          }));

          return {
            ...assoc,
            artist: artistResult.Item || null
          };
        } catch (error) {
          console.error(`Error fetching artist ${assoc.artist_id}:`, error);
          return { ...assoc, artist: null };
        }
      })
    );

    res.json({ associations: associationsWithDetails });
  } catch (error) {
    console.error('Error fetching artist-user associations:', error);
    res.status(500).json({ error: 'Failed to fetch associations', details: error.message });
  }
});

// ============================================
// POST /api/admin/artist-users - Associate user with artist
// ============================================
router.post('/artist-users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { artist_id, user_email } = req.body;

    if (!artist_id || !user_email) {
      return res.status(400).json({ error: 'artist_id and user_email are required' });
    }

    // Check if artist exists
    const artistResult = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: Number(artist_id) }
    }));

    if (!artistResult.Item) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    // Find user by email in Cognito
    const usersResult = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email = "${user_email}"`
    }));

    if (!usersResult.Users || usersResult.Users.length === 0) {
      return res.status(404).json({ error: 'User not found. User must sign up first.' });
    }

    const user = usersResult.Users[0];
    const userId = user.Attributes.find(attr => attr.Name === 'sub').Value;

    // Check if association already exists
    const existingAssoc = await dynamoClient.send(new GetCommand({
      TableName: ARTIST_USERS_TABLE,
      Key: { artist_id: Number(artist_id) }
    }));

    if (existingAssoc.Item) {
      return res.status(400).json({ 
        error: 'Artist already associated with another user',
        existing_email: existingAssoc.Item.email 
      });
    }

    // Check if user is already associated with another artist
    const userAssocResult = await dynamoClient.send(new QueryCommand({
      TableName: ARTIST_USERS_TABLE,
      IndexName: 'UserIdIndex',
      KeyConditionExpression: 'user_id = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }));

    if (userAssocResult.Items && userAssocResult.Items.length > 0) {
      return res.status(400).json({ 
        error: 'User already associated with another artist',
        artist_id: userAssocResult.Items[0].artist_id
      });
    }

    // Create association
    const timestamp = Date.now();
    await dynamoClient.send(new PutCommand({
      TableName: ARTIST_USERS_TABLE,
      Item: {
        artist_id: Number(artist_id),
        user_id: userId,
        email: user_email,
        associated_at: timestamp,
        associated_by: req.user.sub,
        artist_name: artistResult.Item.name
      }
    }));

    res.json({
      success: true,
      message: 'Artist successfully associated with user',
      association: {
        artist_id: Number(artist_id),
        artist_name: artistResult.Item.name,
        user_email,
        user_id: userId
      }
    });
  } catch (error) {
    console.error('Error creating artist-user association:', error);
    res.status(500).json({ error: 'Failed to create association', details: error.message });
  }
});

// ============================================
// DELETE /api/admin/artist-users/:artist_id - Remove association
// ============================================
router.delete('/artist-users/:artist_id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const artistId = Number(req.params.artist_id);

    await dynamoClient.send(new DeleteCommand({
      TableName: ARTIST_USERS_TABLE,
      Key: { artist_id: artistId }
    }));

    res.json({
      success: true,
      message: 'Association removed successfully'
    });
  } catch (error) {
    console.error('Error removing association:', error);
    res.status(500).json({ error: 'Failed to remove association', details: error.message });
  }
});

// ============================================
// OLD ENDPOINT - REMOVED (replaced by full endpoint below with groups & enabled)
// This was conflicting with the proper /users endpoint at line ~267
// ============================================

// ============================================
// GET /api/admin/search-users - Search users in Cognito
// ============================================
router.get('/search-users', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'email query parameter required' });
    }

    const result = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Filter: `email ^= "${email}"`,
      Limit: 10
    }));

    const users = (result.Users || []).map(user => ({
      user_id: user.Attributes.find(attr => attr.Name === 'sub')?.Value,
      username: user.Username,
      email: user.Attributes.find(attr => attr.Name === 'email')?.Value,
      email_verified: user.Attributes.find(attr => attr.Name === 'email_verified')?.Value === 'true',
      created_at: user.UserCreateDate,
      status: user.UserStatus
    }));

    res.json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users', details: error.message });
  }
});

// ============================================
// GET /api/admin/stats - Get admin dashboard stats
// ============================================
router.get('/stats', verifyToken, requireAdmin, async (req, res) => {
  try {
    // Count associations
    const assocResult = await dynamoClient.send(new ScanCommand({
      TableName: ARTIST_USERS_TABLE,
      Select: 'COUNT'
    }));

    // Count total artists
    const artistsResult = await dynamoClient.send(new ScanCommand({
      TableName: ARTISTS_TABLE,
      Select: 'COUNT'
    }));

    res.json({
      total_artists: artistsResult.Count || 0,
      associated_artists: assocResult.Count || 0,
      unassociated_artists: (artistsResult.Count || 0) - (assocResult.Count || 0)
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats', details: error.message });
  }
});

// ============================================
// GET /api/admin/users - Get all Cognito users with their groups
// ============================================
router.get('/users', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('Fetching all users from Cognito...');
    
    // List all users from Cognito
    const listUsersResponse = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60 // Get all users (adjust if you have more)
    }));

    console.log(`Found ${listUsersResponse.Users?.length || 0} users`);

    // For each user, get their groups
    const usersWithGroups = await Promise.all(
      (listUsersResponse.Users || []).map(async (user) => {
        try {
          const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: user.Username
          }));

          const groups = (groupsResponse.Groups || []).map(g => g.GroupName);

          // Extract email from attributes
          const emailAttr = user.Attributes?.find(attr => attr.Name === 'email');

          return {
            username: user.Username,
            email: emailAttr?.Value,
            enabled: user.Enabled,
            userStatus: user.UserStatus,
            groups: groups,
            createdAt: user.UserCreateDate?.toISOString(),
            lastModified: user.UserLastModifiedDate?.toISOString()
          };
        } catch (error) {
          console.error(`Error fetching groups for user ${user.Username}:`, error);
          return {
            username: user.Username,
            email: null,
            enabled: user.Enabled,
            userStatus: user.UserStatus,
            groups: [],
            createdAt: user.UserCreateDate?.toISOString(),
            lastModified: user.UserLastModifiedDate?.toISOString()
          };
        }
      })
    );

    // Filter out disabled users (merged accounts) by default
    // Admin can pass ?includeDisabled=true to see all
    const includeDisabled = req.query.includeDisabled === 'true';
    const filteredUsers = includeDisabled ? usersWithGroups : usersWithGroups.filter(u => u.enabled);

    // Sort: admins first, then by username
    const sortedUsers = filteredUsers.sort((a, b) => {
      const aIsAdmin = a.groups.includes('admin') ? 1 : 0;
      const bIsAdmin = b.groups.includes('admin') ? 1 : 0;
      
      if (aIsAdmin !== bIsAdmin) {
        return bIsAdmin - aIsAdmin; // Admins first
      }
      
      return a.username.localeCompare(b.username);
    });

    res.json({
      users: sortedUsers,
      total: sortedUsers.length,
      admins: sortedUsers.filter(u => u.groups.includes('admin')).length,
      regularUsers: sortedUsers.filter(u => !u.groups.includes('admin')).length,
      disabledCount: usersWithGroups.length - filteredUsers.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ 
      error: 'Failed to fetch users', 
      details: error.message,
      code: 'FETCH_USERS_ERROR'
    });
  }
});

// ============================================
// POST /api/admin/users/:username/add-to-admin - Add user to admin group
// ============================================
router.post('/users/:username/add-to-admin', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;

    console.log(`Adding user ${username} to admin group...`);

    // Verify user exists
    try {
      await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
      }));
    } catch (error) {
      console.error(`User ${username} not found:`, error);
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is already admin
    const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    }));

    const groups = (groupsResponse.Groups || []).map(g => g.GroupName);
    
    if (groups.includes('admin')) {
      return res.status(400).json({ 
        error: 'User is already an admin',
        code: 'ALREADY_ADMIN'
      });
    }

    // Add user to admin group
    await cognitoClient.send(new AdminAddUserToGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: 'admin'
    }));

    console.log(`Successfully added ${username} to admin group`);

    res.json({
      success: true,
      message: `User ${username} has been added to admin group`,
      username: username,
      group: 'admin'
    });
  } catch (error) {
    console.error('Error adding user to admin:', error);
    res.status(500).json({ 
      error: 'Failed to add user to admin group', 
      details: error.message,
      code: 'ADD_ADMIN_ERROR'
    });
  }
});

// ============================================
// POST /api/admin/users/:username/remove-from-admin - Remove user from admin group
// ============================================
router.post('/users/:username/remove-from-admin', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { username } = req.params;
    const currentUserUsername = req.user.username;

    console.log(`Removing user ${username} from admin group...`);

    // Prevent admins from removing themselves
    if (username === currentUserUsername) {
      return res.status(400).json({ 
        error: 'You cannot remove yourself from the admin group',
        code: 'CANNOT_REMOVE_SELF'
      });
    }

    // Verify user exists
    try {
      await cognitoClient.send(new AdminGetUserCommand({
        UserPoolId: USER_POOL_ID,
        Username: username
      }));
    } catch (error) {
      console.error(`User ${username} not found:`, error);
      return res.status(404).json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // Check if user is admin
    const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    }));

    const groups = (groupsResponse.Groups || []).map(g => g.GroupName);
    
    if (!groups.includes('admin')) {
      return res.status(400).json({ 
        error: 'User is not an admin',
        code: 'NOT_ADMIN'
      });
    }

    // Remove user from admin group
    await cognitoClient.send(new AdminRemoveUserFromGroupCommand({
      UserPoolId: USER_POOL_ID,
      Username: username,
      GroupName: 'admin'
    }));

    console.log(`Successfully removed ${username} from admin group`);

    res.json({
      success: true,
      message: `User ${username} has been removed from admin group`,
      username: username,
      group: 'admin'
    });
  } catch (error) {
    console.error('Error removing user from admin:', error);
    res.status(500).json({ 
      error: 'Failed to remove user from admin group', 
      details: error.message,
      code: 'REMOVE_ADMIN_ERROR'
    });
  }
});

// ============================================
// POST /api/admin/merge-duplicates - Auto-merge duplicate accounts
// ============================================
router.post('/merge-duplicates', verifyToken, requireAdmin, async (req, res) => {
  try {
    console.log('🔄 Starting auto-merge for duplicate accounts...');
    
    // Get all users
    const usersResult = await cognitoClient.send(new ListUsersCommand({
      UserPoolId: USER_POOL_ID,
      Limit: 60
    }));

    const users = await Promise.all(
      (usersResult.Users || []).map(async (user) => {
        const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
          UserPoolId: USER_POOL_ID,
          Username: user.Username
        }));

        const groups = (groupsResponse.Groups || []).map(g => g.GroupName);
        const emailAttr = user.Attributes?.find(attr => attr.Name === 'email');

        return {
          username: user.Username,
          sub: user.Attributes?.find(attr => attr.Name === 'sub')?.Value,
          email: emailAttr?.Value,
          enabled: user.Enabled,
          groups: groups,
          createdAt: user.UserCreateDate,
          isGoogle: user.Username.startsWith('Google_')
        };
      })
    );

    // Find duplicates
    const emailMap = new Map();
    users.forEach(user => {
      if (user.email) {
        const existing = emailMap.get(user.email) || [];
        existing.push(user);
        emailMap.set(user.email, existing);
      }
    });

    const duplicates = Array.from(emailMap.entries())
      .filter(([_, users]) => users.length > 1)
      .map(([email, users]) => ({
        email,
        users: users.sort((a, b) => {
          // Prefer non-Google users
          if (a.isGoogle && !b.isGoogle) return 1;
          if (!a.isGoogle && b.isGoogle) return -1;
          // Then prefer older accounts
          return new Date(a.createdAt) - new Date(b.createdAt);
        })
      }));

    if (duplicates.length === 0) {
      return res.json({
        success: true,
        message: 'No duplicate accounts found',
        mergedCount: 0
      });
    }

    const mergeResults = [];

    // Merge each duplicate group
    for (const duplicate of duplicates) {
      const primaryUser = duplicate.users[0];
      const secondaryUsers = duplicate.users.slice(1);

      console.log(`\n📧 Merging duplicates for: ${duplicate.email}`);
      console.log(`   Primary: ${primaryUser.username}`);

      let totalMigrated = 0;

      for (const secondaryUser of secondaryUsers) {
        console.log(`   Secondary: ${secondaryUser.username}`);

        try {
          // Migrate votes
          const votesResult = await dynamoClient.send(new ScanCommand({
            TableName: VOTES_TABLE,
            FilterExpression: 'user_id = :userId',
            ExpressionAttributeValues: { ':userId': secondaryUser.sub }
          }));

          for (const vote of votesResult.Items || []) {
            await dynamoClient.send(new UpdateCommand({
              TableName: VOTES_TABLE,
              Key: { id: vote.id, timestamp: vote.timestamp },
              UpdateExpression: 'SET user_id = :primaryId',
              ExpressionAttributeValues: { ':primaryId': primaryUser.sub }
            }));
          }
          totalMigrated += (votesResult.Items || []).length;

          // Migrate collab requests
          const collabResult = await dynamoClient.send(new ScanCommand({
            TableName: COLLAB_REQUESTS_TABLE,
            FilterExpression: 'requester_id = :userId',
            ExpressionAttributeValues: { ':userId': secondaryUser.sub }
          }));

          for (const request of collabResult.Items || []) {
            await dynamoClient.send(new UpdateCommand({
              TableName: COLLAB_REQUESTS_TABLE,
              Key: { id: request.id },
              UpdateExpression: 'SET requester_id = :primaryId',
              ExpressionAttributeValues: { ':primaryId': primaryUser.sub }
            }));
          }

          // Migrate user profile if exists
          const profileResult = await dynamoClient.send(new GetCommand({
            TableName: USER_PROFILES_TABLE,
            Key: { user_id: secondaryUser.sub }
          }));

          if (profileResult.Item && !profileResult.Item.display_name?.includes('_OLD')) {
            // Check if primary has a profile
            const primaryProfileResult = await dynamoClient.send(new GetCommand({
              TableName: USER_PROFILES_TABLE,
              Key: { user_id: primaryUser.sub }
            }));

            if (!primaryProfileResult.Item) {
              // Move profile to primary
              await dynamoClient.send(new DeleteCommand({
                TableName: USER_PROFILES_TABLE,
                Key: { user_id: secondaryUser.sub }
              }));

              await dynamoClient.send(new PutCommand({
                TableName: USER_PROFILES_TABLE,
                Item: {
                  ...profileResult.Item,
                  user_id: primaryUser.sub
                }
              }));
            }
          }

          // Disable secondary account
          await cognitoClient.send(new AdminDisableUserCommand({
            UserPoolId: USER_POOL_ID,
            Username: secondaryUser.username
          }));

          console.log(`   ✅ Merged ${secondaryUser.username} into ${primaryUser.username}`);

        } catch (error) {
          console.error(`   ❌ Error merging ${secondaryUser.username}:`, error.message);
        }
      }

      mergeResults.push({
        email: duplicate.email,
        primary: primaryUser.username,
        merged: secondaryUsers.map(u => u.username),
        itemsMigrated: totalMigrated
      });
    }

    res.json({
      success: true,
      message: `Successfully merged ${duplicates.length} duplicate email(s)`,
      mergedCount: duplicates.length,
      results: mergeResults
    });

  } catch (error) {
    console.error('Error merging duplicates:', error);
    res.status(500).json({ 
      error: 'Failed to merge duplicate accounts', 
      details: error.message 
    });
  }
});

module.exports = router;
