const { S3Client, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const axios = require('axios');

// Initialize AWS clients
const s3Client = new S3Client();
const dynamoDBClient = new DynamoDBClient();
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
const secretsClient = new SecretsManagerClient();

const S3_BUCKET = process.env.S3_BUCKET_NAME;
const DYNAMODB_TABLE = process.env.DYNAMODB_TABLE_NAME;
const SECRET_NAME = process.env.SECRET_NAME;
const INSTAGRAM_API_BASE = 'https://graph.instagram.com/v21.0';

// Cache pour le secret (évite de le récupérer à chaque invocation)
let cachedSecret = null;

async function getInstagramCredentials() {
  if (cachedSecret) {
    return cachedSecret;
  }
  // Local dev/testing fallback: allow credentials via env var to avoid calling Secrets Manager
  if (process.env.INSTAGRAM_CREDENTIALS_JSON) {
    try {
      cachedSecret = JSON.parse(process.env.INSTAGRAM_CREDENTIALS_JSON);
      console.log('Using INSTAGRAM_CREDENTIALS_JSON from env');
      return cachedSecret;
    } catch (e) {
      console.warn('Invalid JSON in INSTAGRAM_CREDENTIALS_JSON, falling back to Secrets Manager', e.message);
    }
  }

  if (!SECRET_NAME) {
    const err = new Error('SECRET_NAME is not set; set SECRET_NAME or provide INSTAGRAM_CREDENTIALS_JSON for local testing');
    console.error(err.message);
    throw err;
  }
  try {
    const command = new GetSecretValueCommand({ SecretId: SECRET_NAME });
    const response = await secretsClient.send(command);
    cachedSecret = JSON.parse(response.SecretString);
    return cachedSecret;
  } catch (error) {
    console.error('Error retrieving secret:', error);
    throw error;
  }
}

/**
 * Main Lambda handler
 */
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const triggerTime = event.trigger_time || 'manual';
    console.log(`Triggered at: ${triggerTime}`);

    // 1. Récupérer les credentials Instagram depuis Secrets Manager
    const credentials = await getInstagramCredentials();
    const INSTAGRAM_ACCESS_TOKEN = credentials.access_token;
    const INSTAGRAM_ACCOUNT_ID = credentials.account_id;

    // 2. Récupérer une image aléatoire du S3 bucket
    const imageKey = await getRandomImageFromS3();
    
    if (!imageKey) {
      console.log('No images available in S3 bucket');
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'No images to post' })
      };
    }

    console.log(`Selected image: ${imageKey}`);

    // 3. Générer une URL signée publique (24h)
    const getCommand = new GetObjectCommand({
      Bucket: S3_BUCKET,
      Key: imageKey
    });
    
    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 86400 });
    console.log('Generated signed URL');
    
    // 4. Créer un container media sur Instagram
    const createMediaUrl = `${INSTAGRAM_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/media`;
    const createMediaResponse = await axios.post(createMediaUrl, {
      image_url: signedUrl,
      caption: '🎵 #Lyrics #Music #Rap',
      access_token: INSTAGRAM_ACCESS_TOKEN
    });
    
    const creationId = createMediaResponse.data.id;
    console.log('Media container created:', creationId);
    
    // 5. Attendre que l'image soit traitée (5 secondes)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 6. Publier le media
    const publishUrl = `${INSTAGRAM_API_BASE}/${INSTAGRAM_ACCOUNT_ID}/media_publish`;
    const publishResponse = await axios.post(publishUrl, {
      creation_id: creationId,
      access_token: INSTAGRAM_ACCESS_TOKEN
    });
    
    const mediaId = publishResponse.data.id;
    console.log('Media published:', mediaId);

    // 7. Enregistrer dans DynamoDB avec TTL
    await saveToDatabase(imageKey, mediaId, triggerTime);

    // 8. Supprimer l'image du S3
    await deleteImageFromS3(imageKey);
    
    console.log(`Deleted image from S3: ${imageKey}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Successfully posted to Instagram',
        imageKey,
        instagramPostId: mediaId,
        triggerTime
      })
    };

  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error posting to Instagram',
        error: error.message,
        details: error.response?.data
      })
    };
  }
};

/**
 * Récupérer une image aléatoire du S3 bucket
 */
async function getRandomImageFromS3() {
  const listCommand = new ListObjectsV2Command({
    Bucket: S3_BUCKET,
    MaxKeys: 100
  });

  const response = await s3Client.send(listCommand);
  
  if (!response.Contents || response.Contents.length === 0) {
    return null;
  }

  // Filtrer uniquement les images
  const images = response.Contents.filter(obj => 
    obj.Key.match(/\.(jpg|jpeg|png)$/i)
  );

  if (images.length === 0) {
    return null;
  }

  // Sélectionner une image aléatoire
  const randomIndex = Math.floor(Math.random() * images.length);
  return images[randomIndex].Key;
}



/**
 * Enregistrer dans DynamoDB avec TTL (timestamp epoch)
 */
async function saveToDatabase(imageKey, instagramPostId, triggerTime) {
  const timestamp = new Date().toISOString();
  const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 jours en secondes (epoch timestamp)

  const command = new PutCommand({
    TableName: DYNAMODB_TABLE,
    Item: {
      image_id: `${Date.now()}-${imageKey}`,
      image_key: imageKey,
      instagram_post_id: instagramPostId,
      uploaded_at: timestamp,
      trigger_time: triggerTime,
      status: 'published',
      ttl: ttl // Timestamp epoch (number) pour DynamoDB TTL
    }
  });

  await docClient.send(command);
}

/**
 * Supprimer l'image du S3
 */
async function deleteImageFromS3(key) {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  await s3Client.send(command);
}
