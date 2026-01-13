const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { S3Client, ListObjectsV2Command, GetObjectCommand, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient, ScanCommand } = require('@aws-sdk/client-dynamodb');
const { unmarshall } = require('@aws-sdk/util-dynamodb');
const uploadsRouter = require('./routes/uploads');
const proxyRouter = require('./routes/proxy');
const votingRouter = require('./routes/voting');
const votingMonthlyRouter = require('./routes/voting-monthly');
const blogInteractionsRouter = require('./routes/blog-interactions');
const userActivityRouter = require('./routes/user-activity');
const userProfileRouter = require('./routes/user-profile');
const contentInteractionsRouter = require('./routes/content-interactions');
const blogPostsRouter = require('./routes/blog-posts');
const songInteractionsRouter = require('./routes/song-interactions');
// const songLikesRouter = require('./routes/song-likesd');
const songContentRouter = require('./routes/songs');
const albumsRouter = require('./routes/albums');
const artistsRouter = require('./routes/artists');
const searchRouter = require('./routes/search');
const adminRouter = require('./routes/admin');
const artistProfileRouter = require('./routes/artist-profile');
const artistContentRouter = require('./routes/artist-content');
const socialRouter = require('./routes/social');
const collabRequestsRouter = require('./routes/collab-requests');
const { 
  securityHeaders, 
  configureCORS, 
  requestLogger, 
  sanitizeInput,
  rateLimitByIP,
  validateEnvironment 
} = require('./middleware/security');
require('dotenv').config();

// Validate required environment variables early so startup fails fast with a clear message
const requiredEnv = [
  'S3_BUCKET_NAME',
  'DYNAMODB_TABLE_NAME',
  'AWS_REGION'
];

const missing = requiredEnv.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error('Missing required environment variables:', missing.join(', '));
  console.error('Create a backend-api/.env from backend-api/.env.example and fill the values.');
  // Exit so the process doesn't run with undefined configuration
  process.exit(1);
}

// Validate Cognito environment variables for security
validateEnvironment();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Security Middleware (applied first)
app.use(securityHeaders);
app.use(rateLimitByIP);
app.use(requestLogger);

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:8089', 'http://localhost:5173'];
app.use(configureCORS(allowedOrigins));

// Body parsing middleware
app.use(express.json({ limit: '10mb' })); // Limit payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input sanitization
app.use(sanitizeInput);

// Health check endpoint (before authentication)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Mount routers
app.use('/api/uploads', uploadsRouter);
app.use('/api/proxy', proxyRouter);
app.use('/api/voting', votingRouter);
app.use('/api/voting-monthly', votingMonthlyRouter);
app.use('/api/blog', blogInteractionsRouter);
app.use('/api/blog-posts', blogPostsRouter);
app.use('/api/user/activity', userActivityRouter);
app.use('/api/user/profile', userProfileRouter);
app.use('/api/content', contentInteractionsRouter);
app.use('/api/songs', songInteractionsRouter);
app.use('/api/songs', songContentRouter);
app.use('/api/albums', albumsRouter);
app.use('/api/artists', artistsRouter);
app.use('/api/search', searchRouter);
app.use('/api/admin', adminRouter);
app.use('/api/artist-profile', artistProfileRouter);
app.use('/api/artist-content', artistContentRouter);
app.use('/api/social', socialRouter);
app.use('/api/collab-requests', collabRequestsRouter);
// app.use('/', songLikesRouter);

// AWS Clients
// Build AWS client options. If explicit AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY are provided, use them.
const awsRegion = process.env.AWS_REGION || 'eu-north-1';
const awsCreds = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
  ? { credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } }
  : {};

const s3Client = new S3Client(Object.assign({ region: awsRegion }, awsCreds));
const dynamoDBClient = new DynamoDBClient(Object.assign({ region: awsRegion }, awsCreds));

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE_NAME;

// ============================================
// S3 ROUTES
// ============================================

/**
 * GET /api/s3/images
 * Liste toutes les images dans le S3 bucket
 */
app.get('/api/s3/images', async (req, res) => {
  try {
    const command = new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      MaxKeys: 1000
    });

    const response = await s3Client.send(command);

    if (!response.Contents) {
      return res.json({ images: [] });
    }

    // Générer des URLs signées pour chaque image
    const images = await Promise.all(
      response.Contents
        .filter(obj => obj.Key.match(/\.(jpg|jpeg|png)$/i))
        .map(async (obj) => {
          const urlCommand = new GetObjectCommand({
            Bucket: S3_BUCKET,
            Key: obj.Key
          });
          
          const url = await getSignedUrl(s3Client, urlCommand, { expiresIn: 3600 });

          return {
            key: obj.Key,
            size: obj.Size,
            lastModified: obj.LastModified.toISOString(),
            url
          };
        })
    );

    res.json({ images });
  } catch (error) {
    console.error('Error listing S3 images:', error);
    res.status(500).json({ error: 'Failed to list images', details: error.message });
  }
});

/**
 * POST /api/s3/upload
 * Upload des images vers S3
 */
app.post('/api/s3/upload', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadPromises = req.files.map(async (file) => {
      const key = `${Date.now()}-${file.originalname}`;
      
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalname: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      });

      await s3Client.send(command);
      return key;
    });

    const uploadedKeys = await Promise.all(uploadPromises);

    res.json({
      message: 'Images uploaded successfully',
      uploaded: uploadedKeys.length,
      keys: uploadedKeys
    });
  } catch (error) {
    console.error('Error uploading to S3:', error);
    res.status(500).json({ error: 'Failed to upload images', details: error.message });
  }
});

/**
 * GET /api/s3/download-all
 * Télécharge toutes les images du bucket en un seul ZIP streamé
 */
// download-all removed — use upload endpoint to send generated cards to S3

/**
 * DELETE /api/s3/delete
 * Supprimer une image du S3 bucket
 */
app.delete('/api/s3/delete', async (req, res) => {
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: 'Image key is required' });
    }

    const command = new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key
    });

    await s3Client.send(command);

    res.json({ message: 'Image deleted successfully', key });
  } catch (error) {
    console.error('Error deleting from S3:', error);
    res.status(500).json({ error: 'Failed to delete image', details: error.message });
  }
});

// ============================================
// DYNAMODB ROUTES
// ============================================

/**
 * GET /api/dynamodb/records
 * Récupérer l'historique des images uploadées sur Instagram
 */
app.get('/api/dynamodb/records', async (req, res) => {
  try {
    const command = new ScanCommand({
      TableName: DYNAMODB_TABLE,
      Limit: 100
    });

    const response = await dynamoDBClient.send(command);

    if (!response.Items) {
      return res.json({ records: [] });
    }

    const records = response.Items.map(item => unmarshall(item));
    
    // Trier par date (plus récent en premier)
    records.sort((a, b) => 
      new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );

    res.json({ records });
  } catch (error) {
    console.error('Error fetching DynamoDB records:', error);
    res.status(500).json({ error: 'Failed to fetch records', details: error.message });
  }
});

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    s3Bucket: S3_BUCKET,
    dynamoTable: DYNAMODB_TABLE
  });
});

// ============================================
// ERROR HANDLER
// ============================================

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    code: 'NOT_FOUND',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    user: req.user?.sub || 'anonymous',
  });
  
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    ...(isDevelopment && { details: err.stack })
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Backend API running on port ${PORT}`);
  console.log(`📦 S3 Bucket: ${S3_BUCKET}`);
  console.log(`🗄️  DynamoDB Table: ${DYNAMODB_TABLE}`);
});

module.exports = app;
