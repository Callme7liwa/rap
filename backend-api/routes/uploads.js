const express = require('express');
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand, DeleteCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max
  }
});

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'eu-north-1' });
const dynamoClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'eu-north-1' })
);

const USER_UPLOADS_BUCKET = process.env.USER_UPLOADS_BUCKET || 'lyricscape-user-uploads-prod';
const USER_UPLOADS_TABLE = process.env.USER_UPLOADS_TABLE || 'lyricscape-user-uploads-prod';

// ============================================
// POST /api/uploads - Upload fichier (authenticated)
// ============================================
router.post('/', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.sub; // Cognito user ID
    const file = req.file;
    const { visibility = 'private', category = 'general' } = req.body;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    // Générer un ID unique pour l'upload
    const uploadId = uuidv4();
    const timestamp = Date.now();
    const fileExtension = file.originalname.split('.').pop();
    const s3Key = `users/${userId}/${category}/${uploadId}.${fileExtension}`;

    console.log(`Uploading file to S3: ${s3Key}`);

    // Upload vers S3
    await s3Client.send(new PutObjectCommand({
      Bucket: USER_UPLOADS_BUCKET,
      Key: s3Key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Note: ACL removed - bucket uses policy-based access instead
      // Public files will be accessible via bucket policy
      Metadata: {
        userId,
        uploadId,
        originalName: file.originalname,
        visibility
      }
    }));

    // Sauvegarder metadata dans DynamoDB
    const uploadMetadata = {
      upload_id: uploadId,
      user_id: userId,
      s3_key: s3Key,
      filename: file.originalname,
      content_type: file.mimetype,
      size: file.size,
      category,
      visibility, // 'private', 'public', 'temp'
      created_at: timestamp,
      expires_at: visibility === 'temp' ? timestamp + (30 * 24 * 60 * 60 * 1000) : null // 30 jours
    };

    await dynamoClient.send(new PutCommand({
      TableName: USER_UPLOADS_TABLE,
      Item: uploadMetadata
    }));

    // For public files (like profile pictures), generate permanent URL
    let fileUrl;
    if (visibility === 'public') {
      // Public URL format: https://bucket.s3.region.amazonaws.com/key
      fileUrl = `https://${USER_UPLOADS_BUCKET}.s3.${process.env.AWS_REGION || 'eu-north-1'}.amazonaws.com/${s3Key}`;
    } else {
      // For private files, generate signed URL (valid 1 hour)
      fileUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: USER_UPLOADS_BUCKET,
          Key: s3Key
        }),
        { expiresIn: 3600 }
      );
    }

    console.log(`File uploaded successfully: ${uploadId}`);

    res.json({
      success: true,
      upload: {
        id: uploadId,
        url: fileUrl,
        fileUrl: fileUrl, // Alias for compatibility
        s3Key: s3Key,
        filename: file.originalname,
        size: file.size,
        contentType: file.mimetype,
        category,
        visibility
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// ============================================
// GET /api/uploads - Liste des uploads de l'utilisateur
// ============================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const { category, limit = 50 } = req.query;

    console.log(`Fetching uploads for user: ${userId}`);

    // Query DynamoDB pour récupérer les uploads de l'utilisateur
    const params = {
      TableName: USER_UPLOADS_TABLE,
      IndexName: 'UserUploadsIndex',
      KeyConditionExpression: 'user_id = :userId',
      ExpressionAttributeValues: {
        ':userId': userId
      },
      Limit: parseInt(limit),
      ScanIndexForward: false // Trier par date décroissante
    };

    if (category) {
      params.FilterExpression = 'category = :category';
      params.ExpressionAttributeValues[':category'] = category;
    }

    const result = await dynamoClient.send(new QueryCommand(params));
    const uploads = result.Items || [];

    // Générer des URLs signées pour chaque upload
    const uploadsWithUrls = await Promise.all(
      uploads.map(async (upload) => {
        try {
          const signedUrl = await getSignedUrl(
            s3Client,
            new GetObjectCommand({
              Bucket: USER_UPLOADS_BUCKET,
              Key: upload.s3_key
            }),
            { expiresIn: 3600 }
          );

          return {
            ...upload,
            url: signedUrl
          };
        } catch (error) {
          console.error(`Error generating URL for ${upload.upload_id}:`, error);
          return {
            ...upload,
            url: null,
            error: 'URL generation failed'
          };
        }
      })
    );

    res.json({
      uploads: uploadsWithUrls,
      count: uploadsWithUrls.length
    });
  } catch (error) {
    console.error('List uploads error:', error);
    res.status(500).json({ error: 'Failed to list uploads', details: error.message });
  }
});

// ============================================
// GET /api/uploads/:id - Obtenir un upload spécifique
// ============================================
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const uploadId = req.params.id;

    console.log(`Fetching upload: ${uploadId} for user: ${userId}`);

    // Récupérer metadata depuis DynamoDB
    const result = await dynamoClient.send(new GetCommand({
      TableName: USER_UPLOADS_TABLE,
      Key: { upload_id: uploadId }
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const upload = result.Item;

    // Vérifier que l'utilisateur a accès (propriétaire ou admin)
    const isAdmin = req.user['cognito:groups']?.includes('admin');
    if (upload.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Générer URL signée
    const signedUrl = await getSignedUrl(
      s3Client,
      new GetObjectCommand({
        Bucket: USER_UPLOADS_BUCKET,
        Key: upload.s3_key
      }),
      { expiresIn: 3600 }
    );

    res.json({
      upload: {
        ...upload,
        url: signedUrl
      }
    });
  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({ error: 'Failed to get upload', details: error.message });
  }
});

// ============================================
// DELETE /api/uploads/:id - Supprimer un upload
// ============================================
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user.sub;
    const uploadId = req.params.id;

    console.log(`Deleting upload: ${uploadId} for user: ${userId}`);

    // Récupérer metadata
    const result = await dynamoClient.send(new GetCommand({
      TableName: USER_UPLOADS_TABLE,
      Key: { upload_id: uploadId }
    }));

    if (!result.Item) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    const upload = result.Item;

    // Vérifier permissions
    const isAdmin = req.user['cognito:groups']?.includes('admin');
    if (upload.user_id !== userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Supprimer de S3
    await s3Client.send(new DeleteObjectCommand({
      Bucket: USER_UPLOADS_BUCKET,
      Key: upload.s3_key
    }));

    // Supprimer de DynamoDB
    await dynamoClient.send(new DeleteCommand({
      TableName: USER_UPLOADS_TABLE,
      Key: { upload_id: uploadId }
    }));

    console.log(`Upload deleted successfully: ${uploadId}`);

    res.json({ success: true, message: 'Upload deleted' });
  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({ error: 'Failed to delete upload', details: error.message });
  }
});

// ============================================
// GET /api/uploads/admin/all - Admin: Tous les uploads
// ============================================
router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est admin
    const isAdmin = req.user['cognito:groups']?.includes('admin');
    if (!isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { limit = 100, lastKey } = req.query;

    console.log('Admin fetching all uploads');

    const params = {
      TableName: USER_UPLOADS_TABLE,
      Limit: parseInt(limit)
    };

    if (lastKey) {
      params.ExclusiveStartKey = JSON.parse(Buffer.from(lastKey, 'base64').toString());
    }

    const result = await dynamoClient.send(new ScanCommand(params));
    const uploads = result.Items || [];

    const nextKey = result.LastEvaluatedKey
      ? Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64')
      : null;

    res.json({
      uploads,
      nextKey,
      count: uploads.length
    });
  } catch (error) {
    console.error('Admin list error:', error);
    res.status(500).json({ error: 'Failed to list uploads', details: error.message });
  }
});

module.exports = router;
