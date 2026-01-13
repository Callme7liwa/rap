const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, QueryCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const BLOG_POSTS_TABLE = process.env.BLOG_POSTS_TABLE || 'lyricscape-blog-posts-prod';
const BLOG_COMMENTS_TABLE = process.env.BLOG_COMMENTS_TABLE || 'lyricscape-blog-comments-prod';
const VOTES_TABLE = process.env.VOTES_TABLE || 'lyricscape-votes-prod';
const USER_UPLOADS_TABLE = process.env.USER_UPLOADS_TABLE || 'lyricscape-user-uploads-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';
const ALBUMS_TABLE = process.env.ALBUMS_TABLE || 'lyricscape-albums-prod';
const SONGS_TABLE = process.env.SONGS_TABLE || 'lyricscape-songs-prod';

// ============================================
// GET /api/user/activity - Get user's full activity
// ============================================
router.get('/activity', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;

    // Get all blog posts to find likes and saves
    const postsResult = await dynamoClient.send(new ScanCommand({
      TableName: BLOG_POSTS_TABLE
    }));

    const posts = postsResult.Items || [];

    // Extract likes
    const likes = posts
      .filter(post => post.liked_by && post.liked_by[userId])
      .map(post => ({
        like_id: `${post.post_id}_${userId}`,
        post_slug: post.slug,
        post_title: post.title,
        created_at: post.liked_by[userId]
      }))
      .sort((a, b) => b.created_at - a.created_at);

    // Extract saved posts
    const savedPosts = posts
      .filter(post => post.saved_by && post.saved_by[userId])
      .map(post => ({
        saved_id: `${post.post_id}_${userId}`,
        post_slug: post.slug,
        post_title: post.title,
        saved_at: post.saved_by[userId]
      }))
      .sort((a, b) => b.saved_at - a.saved_at);

    // Get user's comments
    const commentsResult = await dynamoClient.send(new ScanCommand({
      TableName: BLOG_COMMENTS_TABLE,
      FilterExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }));

    const comments = (commentsResult.Items || [])
      .map(comment => ({
        comment_id: comment.comment_id,
        post_slug: comment.post_slug,
        post_title: posts.find(p => p.post_id === comment.post_id)?.title || 'Unknown Post',
        content: comment.content,
        created_at: comment.created_at
      }))
      .sort((a, b) => b.created_at - a.created_at);

    // Get user's votes
    const votesResult = await dynamoClient.send(new ScanCommand({
      TableName: VOTES_TABLE
    }));

    const votes = (votesResult.Items || [])
      .filter(event => event.voters && event.voters[userId])
      .map(event => {
        const optionId = event.voters[userId];
        const option = event.options.find(opt => opt.option_id === optionId);

        return {
          vote_id: `${event.event_id}_${userId}`,
          event_id: event.event_id,
          event_title: event.title,
          event_category: event.category,
          selected_option: option ? option.text : 'Unknown',
          voted_at: event.created_at
        };
      })
      .sort((a, b) => b.voted_at - a.voted_at);

    // Get user's uploads
    const uploadsResult = await dynamoClient.send(new QueryCommand({
      TableName: USER_UPLOADS_TABLE,
      IndexName: 'UserUploadsIndex',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      }
    }));

    const uploads = (uploadsResult.Items || [])
      .map(upload => ({
        upload_id: upload.upload_id,
        filename: upload.filename,
        category: upload.category,
        size: upload.size,
        created_at: upload.created_at
      }))
      .sort((a, b) => b.created_at - a.created_at)
      .slice(0, 20); // Limit to last 20 uploads

    // Get liked artists
    const artistsResult = await dynamoClient.send(new ScanCommand({
      TableName: ARTISTS_TABLE
    }));

    const likedArtists = (artistsResult.Items || [])
      .filter(artist => artist.liked_by && artist.liked_by[userId])
      .map(artist => ({
        artist_id: artist.artist_id,
        name: artist.name,
        image_url: artist.image_url,
        liked_at: artist.liked_by[userId]
      }))
      .sort((a, b) => b.liked_at - a.liked_at);

    // Get liked albums
    const albumsResult = await dynamoClient.send(new ScanCommand({
      TableName: ALBUMS_TABLE
    }));

    const likedAlbums = (albumsResult.Items || [])
      .filter(album => album.liked_by && album.liked_by[userId])
      .map(album => ({
        album_id: album.album_id,
        title: album.title,
        artist_name: album.artist_name,
        cover_url: album.cover_url,
        liked_at: album.liked_by[userId]
      }))
      .sort((a, b) => b.liked_at - a.liked_at);

    // Get liked songs
    const songsResult = await dynamoClient.send(new ScanCommand({
      TableName: SONGS_TABLE
    }));

    const likedSongs = (songsResult.Items || [])
      .filter(song => song.liked_by && song.liked_by[userId])
      .map(song => ({
        song_id: song.song_id,
        title: song.title,
        artist_name: song.artist_name,
        album_title: song.album_title,
        liked_at: song.liked_by[userId]
      }))
      .sort((a, b) => b.liked_at - a.liked_at);

    res.json({
      likes,
      comments,
      savedPosts,
      votes,
      uploads,
      likedArtists,
      likedAlbums,
      likedSongs
    });
  } catch (error) {
    console.error('Get user activity error:', error);
    res.status(500).json({ error: 'Failed to get user activity', details: error.message });
  }
});

module.exports = router;
