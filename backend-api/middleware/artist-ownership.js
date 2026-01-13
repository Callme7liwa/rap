/**
 * Artist Ownership Middleware
 * 
 * Checks if a user owns/is associated with an artist or specific content (songs, albums)
 * Allows artists to manage their own content without requiring full admin privileges
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { CognitoIdentityProviderClient, AdminListGroupsForUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || process.env.USER_POOL_ID;
const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';

/**
 * Check if user is an admin
 */
async function isAdmin(username) {
  try {
    const groupsResponse = await cognitoClient.send(new AdminListGroupsForUserCommand({
      UserPoolId: USER_POOL_ID,
      Username: username
    }));
    
    const groups = (groupsResponse.Groups || []).map(g => g.GroupName);
    return groups.includes('admin');
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Get artist ID associated with a user
 */
async function getUserArtistId(userId) {
  try {
    // Use Scan since we might not have a UserIdIndex
    const result = await dynamoClient.send(new ScanCommand({
      TableName: ARTIST_USERS_TABLE,
      FilterExpression: 'user_id = :uid',
      ExpressionAttributeValues: {
        ':uid': userId
      }
    }));

    if (result.Items && result.Items.length > 0) {
      return result.Items[0].artist_id;
    }
    return null;
  } catch (error) {
    console.error('Error getting user artist ID:', error);
    return null;
  }
}

/**
 * Middleware: Require user to be admin OR owner of the artist profile
 */
async function requireArtistOwnership(req, res, next) {
  try {
    const userId = req.user.sub;
    const username = req.user.username;
    const artistIdFromParams = Number(req.params.artist_id || req.params.id);

    // Check if user is admin - admins can do everything
    const userIsAdmin = await isAdmin(username);
    if (userIsAdmin) {
      req.isAdmin = true;
      return next();
    }

    // Check if user owns this artist profile
    const userArtistId = await getUserArtistId(userId);
    
    if (!userArtistId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You must be associated with an artist profile or be an admin to perform this action'
      });
    }

    if (userArtistId !== artistIdFromParams) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only modify your own artist profile'
      });
    }

    // User owns this artist
    req.isArtistOwner = true;
    req.artistId = userArtistId;
    next();
  } catch (error) {
    console.error('Error in requireArtistOwnership middleware:', error);
    res.status(500).json({ error: 'Failed to verify artist ownership' });
  }
}

/**
 * Middleware: Require user to be admin OR owner of a song
 * Song ownership is determined by the artist who created it
 */
async function requireSongOwnership(req, res, next) {
  try {
    const userId = req.user.sub;
    const username = req.user.username;
    const songId = Number(req.params.song_id || req.params.id);

    // Check if user is admin
    const userIsAdmin = await isAdmin(username);
    if (userIsAdmin) {
      req.isAdmin = true;
      return next();
    }

    // Get song details to find the artist
    const songResult = await dynamoClient.send(new GetCommand({
      TableName: SONGS_TABLE,
      Key: { id: songId }
    }));

    if (!songResult.Item) {
      return res.status(404).json({ error: 'Song not found' });
    }

    const song = songResult.Item;
    // Songs use primary_artist_id, not artist_id
    const songArtistId = song.primary_artist_id || song.artist_id;

    // Check if user owns the artist who created this song
    const userArtistId = await getUserArtistId(userId);
    
    if (!userArtistId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You are not associated with any artist profile. Please contact an admin.',
        debug: {
          userId,
          username,
          songId,
          songArtistId
        }
      });
    }
    
    if (userArtistId !== songArtistId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `You can only modify songs from your own artist profile. This song belongs to artist ID ${songArtistId}, but you are associated with artist ID ${userArtistId}.`,
        debug: {
          yourArtistId: userArtistId,
          songArtistId: songArtistId,
          songId,
          songTitle: song.title
        }
      });
    }

    // User owns this song
    req.isArtistOwner = true;
    req.artistId = userArtistId;
    req.song = song;
    next();
  } catch (error) {
    console.error('Error in requireSongOwnership middleware:', error);
    res.status(500).json({ error: 'Failed to verify song ownership' });
  }
}

/**
 * Middleware: Require user to be admin OR owner of an album
 */
async function requireAlbumOwnership(req, res, next) {
  try {
    const userId = req.user.sub;
    const username = req.user.username;
    const albumId = Number(req.params.album_id || req.params.id);

    // Check if user is admin
    const userIsAdmin = await isAdmin(username);
    if (userIsAdmin) {
      req.isAdmin = true;
      return next();
    }

    // Get album details to find the artist
    const albumResult = await dynamoClient.send(new GetCommand({
      TableName: ALBUMS_TABLE,
      Key: { id: albumId }
    }));

    if (!albumResult.Item) {
      return res.status(404).json({ error: 'Album not found' });
    }

    const album = albumResult.Item;
    const albumArtistId = album.artist_id;

    // Check if user owns the artist who created this album
    const userArtistId = await getUserArtistId(userId);
    
    if (!userArtistId || userArtistId !== albumArtistId) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You can only modify albums from your own artist profile'
      });
    }

    // User owns this album
    req.isArtistOwner = true;
    req.artistId = userArtistId;
    req.album = album;
    next();
  } catch (error) {
    console.error('Error in requireAlbumOwnership middleware:', error);
    res.status(500).json({ error: 'Failed to verify album ownership' });
  }
}

/**
 * Middleware: Check if user has permission (admin OR artist owner)
 * This is a lighter check that just adds permission info to the request
 */
async function checkArtistPermissions(req, res, next) {
  try {
    const userId = req.user.sub;
    const username = req.user.username;

    // Check if user is admin
    const userIsAdmin = await isAdmin(username);
    req.isAdmin = userIsAdmin;

    // Get user's artist ID if they have one
    const userArtistId = await getUserArtistId(userId);
    req.userArtistId = userArtistId;
    req.isArtist = !!userArtistId;

    next();
  } catch (error) {
    console.error('Error in checkArtistPermissions middleware:', error);
    // Don't block the request, just continue without permissions
    req.isAdmin = false;
    req.isArtist = false;
    req.userArtistId = null;
    next();
  }
}

module.exports = {
  requireArtistOwnership,
  requireSongOwnership,
  requireAlbumOwnership,
  checkArtistPermissions,
  getUserArtistId,
  isAdmin
};
