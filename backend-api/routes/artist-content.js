/**
 * Artist Content Management Routes
 * 
 * Endpoints for artists to manage their own content:
 * - Update/delete songs
 * - Update/delete albums  
 * - Add new songs/albums
 * - Update lyrics
 * 
 * Access control: Artists can only modify their own content, admins can modify everything
 */

const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, UpdateCommand, DeleteCommand, PutCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyToken } = require('../middleware/auth');
const { 
  requireSongOwnership, 
  requireAlbumOwnership, 
  checkArtistPermissions,
  getUserArtistId
} = require('../middleware/artist-ownership');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';

// ============================================
// PUT /api/artist-content/songs/:id - Update song
// ============================================
router.put('/songs/:id', verifyToken, requireSongOwnership, async (req, res) => {
  try {
    const songId = Number(req.params.id);
    const {
      title,
      song_art_image_url,
      lyrics,
      apple_music_url,
      apple_music_player_url,
      spotify_url,
      youtube_url,
      genius_url,
      description,
      instrumental
    } = req.body;

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (title !== undefined) {
      updateExpressions.push('title = :title');
      expressionAttributeValues[':title'] = title;
    }

    if (song_art_image_url !== undefined) {
      updateExpressions.push('song_art_image_url = :img');
      expressionAttributeValues[':img'] = song_art_image_url;
    }

    if (lyrics !== undefined) {
      updateExpressions.push('lyrics = :lyrics');
      expressionAttributeValues[':lyrics'] = lyrics;
    }

    if (instrumental !== undefined) {
      updateExpressions.push('instrumental = :instrumental');
      expressionAttributeValues[':instrumental'] = instrumental;
    }

    if (apple_music_url !== undefined) {
      updateExpressions.push('apple_music_url = :apple');
      expressionAttributeValues[':apple'] = apple_music_url;
    }

    if (apple_music_player_url !== undefined) {
      updateExpressions.push('apple_music_player_url = :apple_player');
      expressionAttributeValues[':apple_player'] = apple_music_player_url;
    }

    if (spotify_url !== undefined) {
      updateExpressions.push('spotify_url = :spotify');
      expressionAttributeValues[':spotify'] = spotify_url;
    }

    if (youtube_url !== undefined) {
      updateExpressions.push('youtube_url = :youtube');
      expressionAttributeValues[':youtube'] = youtube_url;
    }

    if (genius_url !== undefined) {
      updateExpressions.push('genius_url = :genius');
      expressionAttributeValues[':genius'] = genius_url;
    }

    if (description !== undefined) {
      updateExpressions.push('#desc = :desc');
      expressionAttributeNames['#desc'] = 'description';
      expressionAttributeValues[':desc'] = description;
    }

    if (updateExpressions.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add last updated timestamp
    updateExpressions.push('last_updated = :updated');
    expressionAttributeValues[':updated'] = Date.now();

    // Update song
    await dynamoClient.send(new UpdateCommand({
      TableName: SONGS_TABLE,
      Key: { id: songId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    // Get updated song
    const updatedSong = await dynamoClient.send(new GetCommand({
      TableName: SONGS_TABLE,
      Key: { id: songId }
    }));

    res.json({
      success: true,
      message: 'Song updated successfully',
      song: updatedSong.Item
    });
  } catch (error) {
    console.error('Error updating song:', error);
    res.status(500).json({ error: 'Failed to update song', details: error.message });
  }
});

// ============================================
// DELETE /api/artist-content/songs/:id - Delete song
// ============================================
router.delete('/songs/:id', verifyToken, requireSongOwnership, async (req, res) => {
  try {
    const songId = Number(req.params.id);

    await dynamoClient.send(new DeleteCommand({
      TableName: SONGS_TABLE,
      Key: { id: songId }
    }));

    res.json({
      success: true,
      message: 'Song deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting song:', error);
    res.status(500).json({ error: 'Failed to delete song', details: error.message });
  }
});

// ============================================
// POST /api/artist-content/songs - Create new song
// ============================================
router.post('/songs', verifyToken, checkArtistPermissions, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Check if user has an artist profile
    const artistId = await getUserArtistId(userId);
    if (!artistId && !req.isAdmin) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You must be associated with an artist profile to create songs'
      });
    }

    const {
      title,
      song_art_image_url,
      lyrics,
      apple_music_url,
      spotify_url,
      youtube_url,
      genius_url,
      description,
      album_id
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Song title is required' });
    }

    // Get next ID (simple auto-increment - in production use a better approach)
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: SONGS_TABLE,
      ProjectionExpression: 'id'
    }));
    
    const maxId = scanResult.Items && scanResult.Items.length > 0
      ? Math.max(...scanResult.Items.map(item => item.id))
      : 0;
    
    const newId = maxId + 1;

    const newSong = {
      id: newId,
      artist_id: artistId,
      title,
      song_art_image_url: song_art_image_url || null,
      lyrics: lyrics || '',
      apple_music_url: apple_music_url || null,
      spotify_url: spotify_url || null,
      youtube_url: youtube_url || null,
      genius_url: genius_url || null,
      description: description || null,
      album_id: album_id || null,
      vote_count: 0,
      created_at: Date.now(),
      last_updated: Date.now()
    };

    await dynamoClient.send(new PutCommand({
      TableName: SONGS_TABLE,
      Item: newSong
    }));

    res.status(201).json({
      success: true,
      message: 'Song created successfully',
      song: newSong
    });
  } catch (error) {
    console.error('Error creating song:', error);
    res.status(500).json({ error: 'Failed to create song', details: error.message });
  }
});

// ============================================
// PUT /api/artist-content/albums/:id - Update album
// ============================================
router.put('/albums/:id', verifyToken, requireAlbumOwnership, async (req, res) => {
  try {
    const albumId = Number(req.params.id);
    const {
      name,
      cover_art_url,
      release_year,
      description,
      apple_music_url,
      spotify_url
    } = req.body;

    // Build update expression
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};

    if (name !== undefined) {
      updateExpressions.push('#name = :name');
      expressionAttributeNames['#name'] = 'name';
      expressionAttributeValues[':name'] = name;
    }

    if (cover_art_url !== undefined) {
      updateExpressions.push('cover_art_url = :img');
      expressionAttributeValues[':img'] = cover_art_url;
    }

    if (release_year !== undefined) {
      updateExpressions.push('release_year = :year');
      expressionAttributeValues[':year'] = release_year;
    }

    if (description !== undefined) {
      updateExpressions.push('#desc = :desc');
      expressionAttributeNames['#desc'] = 'description';
      expressionAttributeValues[':desc'] = description;
    }

    if (apple_music_url !== undefined) {
      updateExpressions.push('apple_music_url = :apple');
      expressionAttributeValues[':apple'] = apple_music_url;
    }

    if (spotify_url !== undefined) {
      updateExpressions.push('spotify_url = :spotify');
      expressionAttributeValues[':spotify'] = spotify_url;
    }

    if (updateExpressions.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add last updated timestamp
    updateExpressions.push('last_updated = :updated');
    expressionAttributeValues[':updated'] = Date.now();

    // Update album
    await dynamoClient.send(new UpdateCommand({
      TableName: ALBUMS_TABLE,
      Key: { id: albumId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    // Get updated album
    const updatedAlbum = await dynamoClient.send(new GetCommand({
      TableName: ALBUMS_TABLE,
      Key: { id: albumId }
    }));

    res.json({
      success: true,
      message: 'Album updated successfully',
      album: updatedAlbum.Item
    });
  } catch (error) {
    console.error('Error updating album:', error);
    res.status(500).json({ error: 'Failed to update album', details: error.message });
  }
});

// ============================================
// DELETE /api/artist-content/albums/:id - Delete album
// ============================================
router.delete('/albums/:id', verifyToken, requireAlbumOwnership, async (req, res) => {
  try {
    const albumId = Number(req.params.id);

    await dynamoClient.send(new DeleteCommand({
      TableName: ALBUMS_TABLE,
      Key: { id: albumId }
    }));

    res.json({
      success: true,
      message: 'Album deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting album:', error);
    res.status(500).json({ error: 'Failed to delete album', details: error.message });
  }
});

// ============================================
// POST /api/artist-content/albums - Create new album
// ============================================
router.post('/albums', verifyToken, checkArtistPermissions, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Check if user has an artist profile
    const artistId = await getUserArtistId(userId);
    if (!artistId && !req.isAdmin) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You must be associated with an artist profile to create albums'
      });
    }

    const {
      name,
      cover_art_url,
      release_year,
      description,
      apple_music_url,
      spotify_url
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Album name is required' });
    }

    // Get next ID
    const scanResult = await dynamoClient.send(new ScanCommand({
      TableName: ALBUMS_TABLE,
      ProjectionExpression: 'id'
    }));
    
    const maxId = scanResult.Items && scanResult.Items.length > 0
      ? Math.max(...scanResult.Items.map(item => item.id))
      : 0;
    
    const newId = maxId + 1;

    const newAlbum = {
      id: newId,
      artist_id: artistId,
      name,
      cover_art_url: cover_art_url || null,
      release_year: release_year || new Date().getFullYear(),
      description: description || null,
      apple_music_url: apple_music_url || null,
      spotify_url: spotify_url || null,
      vote_count: 0,
      created_at: Date.now(),
      last_updated: Date.now()
    };

    await dynamoClient.send(new PutCommand({
      TableName: ALBUMS_TABLE,
      Item: newAlbum
    }));

    res.status(201).json({
      success: true,
      message: 'Album created successfully',
      album: newAlbum
    });
  } catch (error) {
    console.error('Error creating album:', error);
    res.status(500).json({ error: 'Failed to create album', details: error.message });
  }
});

// ============================================
// GET /api/artist-content/my-content - Get all content for current artist
// ============================================
router.get('/my-content', verifyToken, checkArtistPermissions, async (req, res) => {
  try {
    const userId = req.user.sub;
    const artistId = await getUserArtistId(userId);

    if (!artistId && !req.isAdmin) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You must be associated with an artist profile'
      });
    }

    // Get songs
    const songsResult = await dynamoClient.send(new ScanCommand({
      TableName: SONGS_TABLE,
      FilterExpression: 'artist_id = :aid',
      ExpressionAttributeValues: {
        ':aid': artistId
      }
    }));

    // Get albums
    const albumsResult = await dynamoClient.send(new ScanCommand({
      TableName: ALBUMS_TABLE,
      FilterExpression: 'artist_id = :aid',
      ExpressionAttributeValues: {
        ':aid': artistId
      }
    }));

    // Get artist info
    const artistResult = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: artistId }
    }));

    res.json({
      artist: artistResult.Item,
      songs: songsResult.Items || [],
      albums: albumsResult.Items || [],
      totalSongs: songsResult.Items?.length || 0,
      totalAlbums: albumsResult.Items?.length || 0
    });
  } catch (error) {
    console.error('Error fetching artist content:', error);
    res.status(500).json({ error: 'Failed to fetch content', details: error.message });
  }
});

module.exports = router;
