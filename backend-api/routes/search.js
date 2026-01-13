/**
 * Routes pour la recherche globale
 */

const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
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

/**
 * GET /api/search?q=query
 * Recherche globale dans artists, albums et songs
 */
router.get('/', async (req, res) => {
  try {
    const { q = '' } = req.query;
    
    if (!q || q.trim() === '') {
      return res.json({ artists: [], albums: [], songs: [] });
    }

    const searchTerm = q.toLowerCase();

    // Rechercher en parallèle dans les 3 tables
    const [artistsResult, albumsResult, songsResult] = await Promise.all([
      // Rechercher dans les artistes
      docClient.send(new ScanCommand({
        TableName: ARTISTS_TABLE,
        Limit: 50
      })),
      
      // Rechercher dans les albums
      docClient.send(new ScanCommand({
        TableName: ALBUMS_TABLE,
        Limit: 50
      })),
      
      // Rechercher dans les chansons
      docClient.send(new ScanCommand({
        TableName: SONGS_TABLE,
        Limit: 100
      }))
    ]);

    // Filtrer les artistes
    const artists = (artistsResult.Items || []).filter(artist =>
      artist.name.toLowerCase().includes(searchTerm) ||
      (artist.alternate_names && artist.alternate_names.some(name =>
        name.toLowerCase().includes(searchTerm)
      ))
    ).slice(0, 10); // Limiter à 10 résultats

    // Filtrer les albums
    const albums = (albumsResult.Items || []).filter(album =>
      album.name.toLowerCase().includes(searchTerm) ||
      album.artist_name.toLowerCase().includes(searchTerm) ||
      album.full_title.toLowerCase().includes(searchTerm)
    ).slice(0, 10);

    // Filtrer les chansons
    const songs = (songsResult.Items || []).filter(song =>
      song.title.toLowerCase().includes(searchTerm) ||
      song.primary_artist_name.toLowerCase().includes(searchTerm) ||
      song.full_title.toLowerCase().includes(searchTerm)
    ).slice(0, 15);

    res.json({
      artists,
      albums,
      songs,
      query: q
    });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ 
      error: 'Failed to perform search', 
      details: error.message,
      artists: [],
      albums: [],
      songs: []
    });
  }
});

module.exports = router;
