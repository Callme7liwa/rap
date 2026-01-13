/**
 * Routes pour la gestion des artistes
 */

const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, ScanCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
require('dotenv').config();

// Configuration AWS
const awsRegion = process.env.AWS_REGION || 'eu-north-1';
const awsCreds = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }
  : {};

const client = new DynamoDBClient(Object.assign({ region: awsRegion }, awsCreds));
const docClient = DynamoDBDocumentClient.from(client);

const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';
const VOTES_TABLE = process.env.VOTES_TABLE || 'lyricscape-votes-prod';

// Helper function to get vote counts for items
async function getVoteCounts(type) {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: VOTES_TABLE,
      FilterExpression: 'item_type = :type AND begins_with(PK, :votePrefix)',
      ExpressionAttributeValues: {
        ':type': type,
        ':votePrefix': 'VOTE#'
      }
    }));

    const voteCounts = {};
    for (const vote of result.Items || []) {
      voteCounts[vote.item_id] = (voteCounts[vote.item_id] || 0) + 1;
    }
    return voteCounts;
  } catch (error) {
    console.error(`Error fetching vote counts for ${type}:`, error);
    return {};
  }
}

/**
 * GET /api/artists
 * Liste des artistes avec pagination et recherche
 */
router.get('/', async (req, res) => {
  try {
    const { query = '', page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let artists = [];
    let scanParams = {
      TableName: ARTISTS_TABLE,
      Limit: 1000 // Scanner plus d'items pour pouvoir filtrer et paginer
    };

    // Scanner la table (idéalement utiliser un GSI pour la recherche)
    const command = new ScanCommand(scanParams);
    const result = await docClient.send(command);
    artists = result.Items || [];

    // Get vote counts for all artists
    const voteCounts = await getVoteCounts('artist');

    // Add vote_count to each artist
    artists = artists.map(artist => ({
      ...artist,
      vote_count: voteCounts[artist.id] || 0
    }));

    // Filtrer par recherche si query est fourni
    if (query) {
      const searchTerm = query.toLowerCase();
      artists = artists.filter(artist => 
        artist.name.toLowerCase().includes(searchTerm) ||
        (artist.alternate_names && artist.alternate_names.some(name => 
          name.toLowerCase().includes(searchTerm)
        ))
      );
    }

    // Sort by vote count first, then by followers count
    artists.sort((a, b) => {
      const voteDiff = (b.vote_count || 0) - (a.vote_count || 0);
      if (voteDiff !== 0) return voteDiff;
      return (b.followers_count || 0) - (a.followers_count || 0);
    });

    // Pagination
    const total = artists.length;
    const start = (pageNum - 1) * limitNum;
    const paginatedArtists = artists.slice(start, start + limitNum);

    res.json({
      data: paginatedArtists,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Failed to fetch artists', details: error.message });
  }
});

/**
 * GET /api/artists/:id
 * Récupérer un artiste par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const artistId = parseInt(req.params.id);

    const command = new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: artistId }
    });

    const result = await docClient.send(command);
    
    if (!result.Item) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json(result.Item);
  } catch (error) {
    console.error('Error fetching artist:', error);
    res.status(500).json({ error: 'Failed to fetch artist', details: error.message });
  }
});

/**
 * GET /api/artists/slug/:slug
 * Récupérer un artiste par slug
 */
router.get('/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const command = new QueryCommand({
      TableName: ARTISTS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    });

    const result = await docClient.send(command);
    
    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Artist not found' });
    }

    res.json(result.Items[0]);
  } catch (error) {
    console.error('Error fetching artist by slug:', error);
    res.status(500).json({ error: 'Failed to fetch artist', details: error.message });
  }
});

/**
 * GET /api/artists/:id/songs
 * Récupérer toutes les chansons d'un artiste
 */
router.get('/:id/songs', async (req, res) => {
  try {
    const artistId = parseInt(req.params.id);
    const { page = '1', limit = '50' } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Scanner les chansons pour cet artiste
    const command = new ScanCommand({
      TableName: SONGS_TABLE,
      FilterExpression: 'primary_artist_id = :artistId',
      ExpressionAttributeValues: {
        ':artistId': artistId
      }
    });

    const result = await docClient.send(command);
    let songs = result.Items || [];

    // Trier par popularité (pageviews)
    songs.sort((a, b) => (b.pageviews || 0) - (a.pageviews || 0));

    // Pagination
    const total = songs.length;
    const start = (pageNum - 1) * limitNum;
    const paginatedSongs = songs.slice(start, start + limitNum);

    res.json({
      data: paginatedSongs,
      total,
      page: pageNum,
      limit: limitNum
    });
  } catch (error) {
    console.error('Error fetching artist songs:', error);
    res.status(500).json({ error: 'Failed to fetch artist songs', details: error.message });
  }
});

/**
 * GET /api/artists/:id/albums
 * Récupérer tous les albums d'un artiste
 */
router.get('/:id/albums', async (req, res) => {
  try {
    const artistId = parseInt(req.params.id);

    const command = new ScanCommand({
      TableName: ALBUMS_TABLE,
      FilterExpression: 'artist_id = :artistId',
      ExpressionAttributeValues: {
        ':artistId': artistId
      }
    });

    const result = await docClient.send(command);
    const albums = result.Items || [];

    // Trier par date de sortie décroissante
    albums.sort((a, b) => {
      const dateA = a.release_date_for_display || '';
      const dateB = b.release_date_for_display || '';
      return dateB.localeCompare(dateA);
    });

    res.json(albums);
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    res.status(500).json({ error: 'Failed to fetch artist albums', details: error.message });
  }
});

module.exports = router;
