# Backend API for Lyricscape S3 Manager

Simple Express.js API to interact with AWS S3 and DynamoDB for the Lyricscape Instagram automation system.

## Features

- 📤 Upload images to S3
- 📋 List all images in S3 bucket
- 🗑️ Delete images from S3
- 📊 View Instagram posting history from DynamoDB

## Setup

### 1. Install Dependencies

```bash
cd backend-api
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your AWS credentials:

```env
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
S3_BUCKET_NAME=lyricscape-lyrics-images-prod
DYNAMODB_TABLE_NAME=lyricscape-uploaded-images-prod
```

### 3. Run the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3000`

## API Endpoints

### S3 Operations

#### `GET /api/s3/images`
List all images in the S3 bucket with presigned URLs.

**Response:**
```json
{
  "images": [
    {
      "key": "1728123456-image.png",
      "size": 1024000,
      "lastModified": "2025-10-07T10:30:00.000Z",
      "url": "https://s3.amazonaws.com/..."
    }
  ]
}
```

#### `POST /api/s3/upload`
Upload one or multiple images to S3.

**Request:**
- Content-Type: `multipart/form-data`
- Field: `images` (max 10 files)

**Response:**
```json
{
  "message": "Images uploaded successfully",
  "uploaded": 2,
  "keys": ["1728123456-image1.png", "1728123457-image2.png"]
}
```

#### `DELETE /api/s3/delete`
Delete an image from S3.

**Request:**
```json
{
  "key": "1728123456-image.png"
}
```

**Response:**
```json
{
  "message": "Image deleted successfully",
  "key": "1728123456-image.png"
}
```

### DynamoDB Operations

#### `GET /api/dynamodb/records`
Get Instagram posting history from DynamoDB.

**Response:**
```json
{
  "records": [
    {
      "image_id": "uuid-here",
      "image_key": "1728123456-image.png",
      "instagram_post_id": "123456789",
      "uploaded_at": "2025-10-07T09:00:00.000Z",
      "trigger_time": "morning",
      "status": "uploaded"
    }
  ]
}
```

### Health Check

#### `GET /api/health`
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-07T10:30:00.000Z",
  "s3Bucket": "lyricscape-lyrics-images-prod",
  "dynamoTable": "lyricscape-uploaded-images-prod"
}
```

## Testing with cURL

```bash
# Health check
curl http://localhost:3000/api/health

# List images
curl http://localhost:3000/api/s3/images

# Upload image
curl -X POST http://localhost:3000/api/s3/upload \
  -F "images=@./image.png"

# Delete image
curl -X DELETE http://localhost:3000/api/s3/delete \
  -H "Content-Type: application/json" \
  -d '{"key":"1728123456-image.png"}'

# View history
curl http://localhost:3000/api/dynamodb/records
```

## AWS IAM Permissions

Your AWS user/role needs these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::lyricscape-lyrics-images-prod",
        "arn:aws:s3:::lyricscape-lyrics-images-prod/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Scan",
        "dynamodb:GetItem"
      ],
      "Resource": "arn:aws:dynamodb:us-east-1:*:table/lyricscape-uploaded-images-prod"
    }
  ]
}
```

## Security Notes

- ✅ CORS is enabled (configure for production)
- ✅ Uses presigned URLs for secure S3 access
- ✅ Environment variables for credentials
- ⚠️ Add authentication/authorization for production
- ⚠️ Add rate limiting for production
- ⚠️ Validate file types and sizes

## Deployment

### Option 1: AWS EC2 or VPS

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and setup
git clone <your-repo>
cd backend-api
npm install
cp .env.example .env
# Edit .env

# Run with PM2
npm install -g pm2
pm2 start server.js --name lyricscape-api
pm2 startup
pm2 save
```

### Option 2: AWS Lambda + API Gateway

Use the Serverless Framework or SAM to deploy as Lambda functions.

### Option 3: Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

## Troubleshooting

### "Access Denied" errors
- Check your AWS credentials in `.env`
- Verify IAM permissions
- Ensure bucket/table names are correct

### CORS errors in browser
- Update CORS configuration in `server.js`
- Add your frontend URL to allowed origins

### Images not appearing
- Check S3 bucket exists and has images
- Verify presigned URL generation
- Check CloudWatch logs for Lambda errors

## Next Steps

- [ ] Add authentication (JWT, API keys)
- [ ] Add file type validation
- [ ] Add image optimization (resize, compress)
- [ ] Add rate limiting
- [ ] Add request logging
- [ ] Deploy to production
