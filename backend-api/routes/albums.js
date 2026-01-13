const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'eu-north-1'
});

const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = 'lyricscape-albums-prod';
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

// Get all albums
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, artistId, year } = req.query;
    const parsedLimit = parseInt(limit) || 20;
    const parsedPage = parseInt(page) || 1;

    let params = {
      TableName: TABLE_NAME,
      Limit: 1000 // Scan more to enable sorting
    };

    // Add filters if provided
    if (artistId || year) {
      let filterExpression = [];
      let expressionAttributeValues = {};

      if (artistId) {
        filterExpression.push('primary_artist_id = :artistId');
        expressionAttributeValues[':artistId'] = parseInt(artistId);
      }

      if (year) {
        filterExpression.push('contains(release_date_for_display, :year)');
        expressionAttributeValues[':year'] = year;
      }

      if (filterExpression.length > 0) {
        params.FilterExpression = filterExpression.join(' AND ');
        params.ExpressionAttributeValues = expressionAttributeValues;
      }
    }

    const data = await docClient.send(new ScanCommand(params));
    let albums = data.Items || [];

    // Get vote counts for all albums
    const voteCounts = await getVoteCounts('album');

    // Add vote_count to each album
    albums = albums.map(album => ({
      ...album,
      vote_count: voteCounts[album.id] || 0
    }));

    // Sort by vote count first, then by name
    albums.sort((a, b) => {
      const voteDiff = (b.vote_count || 0) - (a.vote_count || 0);
      if (voteDiff !== 0) return voteDiff;
      return a.name.localeCompare(b.name);
    });

    // Pagination
    const total = albums.length;
    const start = (parsedPage - 1) * parsedLimit;
    const paginatedAlbums = albums.slice(start, start + parsedLimit);
    
    res.json({
      data: paginatedAlbums,
      total,
      page: parsedPage,
      limit: parsedLimit
    });
  } catch (error) {
    console.error('Error fetching albums:', error);
    res.status(500).json({ error: 'Failed to fetch albums' });
  }
});

// Get album by ID
router.get('/:id', async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      Key: {
        id: parseInt(req.params.id) // La clé primaire est 'id' de type Number
      }
    };

    const data = await docClient.send(new GetCommand(params));
    
    if (!data.Item) {
      return res.status(404).json({ error: 'Album not found' });
    }

    res.json(data.Item);
  } catch (error) {
    console.error('Error fetching album:', error);
    res.status(500).json({ error: 'Failed to fetch album' });
  }
});

// Get albums by artist ID, sorted by release date
router.get('/artist/:artistId', async (req, res) => {
  try {
    const params = {
      TableName: TABLE_NAME,
      IndexName: 'ArtistIdIndex', // Nom correct du GSI
      KeyConditionExpression: 'artist_id = :artistId',
      ExpressionAttributeValues: {
        ':artistId': parseInt(req.params.artistId)
      },
      // By default, scans are ascending. Use ScanIndexForward: false for descending (newest first)
      ScanIndexForward: false // This will return newest albums first
    };

    const data = await docClient.send(new QueryCommand(params));
    res.json(data.Items);
  } catch (error) {
    console.error('Error fetching artist albums:', error);
    res.status(500).json({ error: 'Failed to fetch artist albums' });
  }
});

module.exports = router;