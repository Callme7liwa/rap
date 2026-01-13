const express = require('express');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../middleware/auth');
const { checkArtistPermissions } = require('../middleware/artist-ownership');

const router = express.Router();

const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const BLOG_POSTS_TABLE = process.env.BLOG_POSTS_TABLE || 'lyricscape-blog-posts-prod';
const ARTISTS_TABLE = process.env.ARTISTS_TABLE || 'lyricscape-artists-prod';

// ============================================
// GET /api/blog-posts - Get all published blog posts
// ============================================
router.get('/', async (req, res) => {
  try {
    const { limit = 20, status = 'published' } = req.query;

    const result = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_POSTS_TABLE,
      IndexName: 'StatusIndex',
      KeyConditionExpression: '#status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: {
        ':status': status
      },
      Limit: parseInt(limit),
      ScanIndexForward: false // Sort by created_at descending
    }));

    res.json({ posts: result.Items || [] });
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({ error: 'Failed to get blog posts', details: error.message });
  }
});

// ============================================
// GET /api/blog-posts/:slug - Get blog post by slug
// ============================================
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const result = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_POSTS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json({ post: result.Items[0] });
  } catch (error) {
    console.error('Get blog post by slug error:', error);
    res.status(500).json({ error: 'Failed to get blog post', details: error.message });
  }
});

// ============================================
// POST /api/blog-posts - Create new blog post (authenticated, artist only)
// ============================================
router.post('/', verifyToken, checkArtistPermissions, async (req, res) => {
  try {
    const userId = req.user.sub;
    const userEmail = req.user.email || 'Anonymous';
    const artistId = req.userArtistId; // From checkArtistPermissions middleware
    
    if (!artistId) {
      return res.status(403).json({ 
        error: 'Artist access required',
        message: 'Only users associated with an artist profile can create blog posts.'
      });
    }

    // Get artist details
    const artistResult = await dynamoClient.send(new GetCommand({
      TableName: ARTISTS_TABLE,
      Key: { id: artistId }
    }));

    if (!artistResult.Item) {
      return res.status(404).json({ error: 'Artist profile not found' });
    }

    const artist = artistResult.Item;
    
    const {
      title,
      slug,
      excerpt,
      content,
      coverImage,
      tags = [],
      status = 'draft'
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const postId = uuidv4();
    const timestamp = Date.now();

    // Generate slug from title if not provided
    const finalSlug = slug || title.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const post = {
      post_id: postId,
      slug: finalSlug,
      title,
      excerpt: excerpt || content.substring(0, 200),
      content,
      cover_image: coverImage || '',
      author_id: userId,
      author_email: userEmail,
      artist_id: artistId,  // Artist association
      artist_name: artist.name, // For easy display
      artist_image: artist.image || '', // Artist profile image
      tags,
      status,
      created_at: timestamp,
      updated_at: timestamp,
      published_at: status === 'published' ? timestamp : null,
      likes: 0,
      comments: 0,
      views: 0,
      liked_by: {},
      saved_by: {}
    };

    await dynamoClient.send(new PutCommand({
      TableName: BLOG_POSTS_TABLE,
      Item: post
    }));

    res.json({ success: true, post });
  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(500).json({ error: 'Failed to create blog post', details: error.message });
  }
});

// ============================================
// PUT /api/blog-posts/:slug - Update blog post (authenticated, artist/author only)
// ============================================
router.put('/:slug', verifyToken, checkArtistPermissions, async (req, res) => {
  try {
    const userId = req.user.sub;
    const artistId = req.userArtistId;
    const { slug } = req.params;

    // Get existing post
    const result = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_POSTS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];

    // Check if user is the author OR is the artist who owns the post
    if (post.author_id !== userId && post.artist_id !== artistId) {
      return res.status(403).json({ 
        error: 'You can only edit posts from your own artist profile' 
      });
    }

    const {
      title,
      excerpt,
      content,
      coverImage,
      tags,
      status
    } = req.body;

    const updateExpression = [];
    const expressionAttributeNames = {};
    const expressionAttributeValues = {};

    if (title) {
      updateExpression.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = title;
    }

    if (excerpt) {
      updateExpression.push('excerpt = :excerpt');
      expressionAttributeValues[':excerpt'] = excerpt;
    }

    if (content) {
      updateExpression.push('content = :content');
      expressionAttributeValues[':content'] = content;
    }

    if (coverImage !== undefined) {
      updateExpression.push('cover_image = :cover_image');
      expressionAttributeValues[':cover_image'] = coverImage;
    }

    if (tags) {
      updateExpression.push('tags = :tags');
      expressionAttributeValues[':tags'] = tags;
    }

    if (status) {
      updateExpression.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;

      // Set published_at if publishing for the first time
      if (status === 'published' && !post.published_at) {
        updateExpression.push('published_at = :published_at');
        expressionAttributeValues[':published_at'] = Date.now();
      }
    }

    updateExpression.push('updated_at = :updated_at');
    expressionAttributeValues[':updated_at'] = Date.now();

    await dynamoClient.send(new UpdateCommand({
      TableName: BLOG_POSTS_TABLE,
      Key: { post_id: post.post_id, created_at: post.created_at },
      UpdateExpression: 'SET ' + updateExpression.join(', '),
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues
    }));

    res.json({ success: true, message: 'Post updated successfully' });
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({ error: 'Failed to update blog post', details: error.message });
  }
});

// ============================================
// DELETE /api/blog-posts/:slug - Delete blog post (authenticated, artist only)
// ============================================
router.delete('/:slug', verifyToken, checkArtistPermissions, async (req, res) => {
  try {
    const userId = req.user.sub;
    const artistId = req.userArtistId;
    const { slug } = req.params;

    // Get existing post
    const result = await dynamoClient.send(new QueryCommand({
      TableName: BLOG_POSTS_TABLE,
      IndexName: 'SlugIndex',
      KeyConditionExpression: 'slug = :slug',
      ExpressionAttributeValues: {
        ':slug': slug
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const post = result.Items[0];

    // Check if user is the author OR is the artist who owns the post
    if (post.author_id !== userId && post.artist_id !== artistId) {
      return res.status(403).json({ 
        error: 'You can only delete posts from your own artist profile' 
      });
    }

    await dynamoClient.send(new DeleteCommand({
      TableName: BLOG_POSTS_TABLE,
      Key: { post_id: post.post_id, created_at: post.created_at }
    }));

    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({ error: 'Failed to delete blog post', details: error.message });
  }
});

// ============================================
// POST /api/blog-posts/seed - Seed initial blog posts (development only)
// ============================================
router.post('/seed', async (req, res) => {
  try {
    const { posts } = req.body;

    if (!posts || !Array.isArray(posts)) {
      return res.status(400).json({ error: 'Posts array is required' });
    }

    const results = [];

    for (const postData of posts) {
      const postId = uuidv4();
      const timestamp = Date.now();

      const post = {
        post_id: postId,
        slug: postData.slug,
        title: postData.title,
        excerpt: postData.excerpt,
        content: postData.content,
        cover_image: postData.coverImage || '',
        author_id: String(postData.authorId),
        author_email: postData.authorName,
        tags: postData.tags || [],
        status: 'published',
        created_at: new Date(postData.publishedAt).getTime(),
        updated_at: timestamp,
        published_at: new Date(postData.publishedAt).getTime(),
        likes: postData.likeCount || 0,
        comments: postData.commentCount || 0,
        views: postData.viewCount || 0,
        liked_by: {},
        saved_by: {}
      };

      await dynamoClient.send(new PutCommand({
        TableName: BLOG_POSTS_TABLE,
        Item: post
      }));

      results.push(post);
    }

    res.json({ success: true, message: `Seeded ${results.length} posts`, posts: results });
  } catch (error) {
    console.error('Seed blog posts error:', error);
    res.status(500).json({ error: 'Failed to seed blog posts', details: error.message });
  }
});

module.exports = router;
