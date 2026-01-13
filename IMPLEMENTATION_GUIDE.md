# 🚀 Implementation Guide - User Uploads & Data Architecture

This guide walks you through deploying the new data architecture for user-generated content management.

## 📋 Overview

We've implemented a comprehensive data management system with:
- **8 DynamoDB tables** for different data entities
- **S3 bucket** for user file uploads with automatic cleanup
- **Backend API routes** for file upload management
- **Frontend page** for users to manage their uploads
- **Access control** (users see only their files, admins see all)
- **30-day TTL** for temporary files

---

## 🏗️ Architecture Components

### DynamoDB Tables
1. **users_profile** - Extended user profile data
2. **blog_posts** - Blog content with author/status indexes
3. **blog_comments** - Comments with post/author indexes
4. **votes** - Voting data with user/poll indexes
5. **user_uploads** - File metadata with TTL support
6. **artists** - Artist profiles
7. **albums** - Album data with relationships
8. **songs** - Song data with relationships

### S3 Buckets
1. **lyricscape-lyrics-images-prod** (existing) - Instagram posting
2. **lyricscape-user-uploads-prod** (NEW) - User file uploads
   - Structure: `users/{user_id}/{category}/{upload_id}.ext`
   - Categories: images, audio, documents, temp, general
   - Temp files auto-deleted after 30 days

### Backend Routes
- `POST /api/uploads` - Upload file
- `GET /api/uploads` - List user's uploads
- `GET /api/uploads/:id` - Get single upload
- `DELETE /api/uploads/:id` - Delete upload
- `GET /api/uploads/admin/all` - Admin view all uploads

### Frontend Pages
- `/my-uploads` (protected) - User upload dashboard
- Upload, download, delete files
- Filter by category (all, images, audio)

---

## 📦 Step 1: Apply Terraform Infrastructure

Navigate to terraform directory and apply changes:

```bash
cd terraform

# Review what will be created (8 tables + 1 bucket)
terraform plan

# Apply infrastructure changes
terraform apply
```

**Expected output:**
```
Plan: 15 to add, 0 to change, 0 to destroy.

Changes to Outputs:
  + user_uploads_bucket_name = "lyricscape-user-uploads-prod"
  + dynamodb_tables = {
      + users_profile    = "lyricscape-users-profile-prod"
      + blog_posts       = "lyricscape-blog-posts-prod"
      + blog_comments    = "lyricscape-blog-comments-prod"
      + votes            = "lyricscape-votes-prod"
      + user_uploads     = "lyricscape-user-uploads-prod"
      + artists          = "lyricscape-artists-prod"
      + albums           = "lyricscape-albums-prod"
      + songs            = "lyricscape-songs-prod"
    }
```

**What gets created:**
- 8 DynamoDB tables with indexes
- 1 S3 bucket with:
  - CORS configuration for localhost:8089/8090
  - Lifecycle rules (30-day temp file deletion)
  - Server-side encryption (AES256)
  - Versioning enabled
  - Public access blocked
  - TLS-only policy

**Time estimate:** ~2-3 minutes

---

## 🔧 Step 2: Install Backend Dependencies

Navigate to backend and install required packages:

```bash
cd ../backend-api

npm install multer @aws-sdk/lib-dynamodb @aws-sdk/s3-request-presigner
```

**Packages installed:**
- `multer` - Multipart/form-data file upload middleware
- `@aws-sdk/lib-dynamodb` - DynamoDB document client (high-level API)
- `@aws-sdk/s3-request-presigner` - Generate signed S3 URLs

**Already installed:**
- `@aws-sdk/client-s3` - S3 operations
- `@aws-sdk/client-dynamodb` - DynamoDB operations
- `express` - Web framework
- `cors` - CORS middleware
- `dotenv` - Environment variables

---

## ⚙️ Step 3: Update Backend Environment Variables

Copy the example and fill in values:

```bash
cp .env.example .env
```

Edit `backend-api/.env` with the table names from Terraform output:

```env
# AWS Configuration
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Legacy S3 Bucket (for lyrics images)
S3_BUCKET_NAME=lyricscape-lyrics-images-prod

# User Uploads S3 Bucket (NEW)
USER_UPLOADS_BUCKET=lyricscape-user-uploads-prod

# DynamoDB Tables
DYNAMODB_TABLE_NAME=lyricscape-instagram-uploads-prod
USER_UPLOADS_TABLE=lyricscape-user-uploads-prod
USERS_PROFILE_TABLE=lyricscape-users-profile-prod
BLOG_POSTS_TABLE=lyricscape-blog-posts-prod
BLOG_COMMENTS_TABLE=lyricscape-blog-comments-prod
VOTES_TABLE=lyricscape-votes-prod
ARTISTS_TABLE=lyricscape-artists-prod
ALBUMS_TABLE=lyricscape-albums-prod
SONGS_TABLE=lyricscape-songs-prod

# Cognito Configuration
COGNITO_USER_POOL_ID=eu-north-1_e4j7eAxOe
COGNITO_CLIENT_ID=nqvnmimojggjpuvfk0cldeu2t

# Server Configuration
PORT=3000
```

**Note:** Get AWS credentials from your AWS IAM user with permissions for:
- S3 (PutObject, GetObject, DeleteObject, ListBucket)
- DynamoDB (PutItem, GetItem, UpdateItem, DeleteItem, Query, Scan)

---

## 🧪 Step 4: Create Auth Middleware (if not exists)

Create `backend-api/middleware/auth.js`:

```javascript
const { CognitoJwtVerifier } = require('aws-jwt-verify');

const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'access',
  clientId: process.env.COGNITO_CLIENT_ID,
});

async function verifyToken(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const payload = await verifier.verify(token);
    
    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      groups: payload['cognito:groups'] || []
    };

    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { verifyToken };
```

Install the package:

```bash
npm install aws-jwt-verify
```

---

## 🚀 Step 5: Test the Upload System

### 5.1 Start the Backend

```bash
cd backend-api
node server.js
```

Expected output:
```
🚀 Backend API running on port 3000
📦 S3 Bucket: lyricscape-lyrics-images-prod
🗄️  DynamoDB Table: lyricscape-instagram-uploads-prod
```

### 5.2 Start the Frontend

In a new terminal:

```bash
cd ..
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:8089/
```

### 5.3 Test Upload Flow

1. **Sign in** to your account
2. Navigate to **My Uploads** (should be in navigation or go to `/my-uploads`)
3. **Upload a file**:
   - Click "Upload File" button
   - Select an image/audio file
   - File should upload and appear in the list
4. **Verify in AWS Console**:
   - Open S3 console → `lyricscape-user-uploads-prod`
   - Check folder: `users/{your-user-id}/general/`
   - File should be there
5. **Check DynamoDB**:
   - Open DynamoDB console → `lyricscape-user-uploads-prod`
   - Should see item with your `user_id` and file metadata
6. **Test Download**:
   - Click "Download" button on uploaded file
   - File should download via signed URL
7. **Test Delete**:
   - Click delete button
   - File should be removed from both S3 and DynamoDB

---

## 🔐 Step 6: Test Access Control

### User Access Test
1. Upload file as User A
2. Try to access `/api/uploads` → should see only User A's files
3. Try to access `/api/uploads/{user_b_upload_id}` → should get 403 Forbidden

### Admin Access Test
1. Add user to Admins group in Cognito:
   ```bash
   aws cognito-idp admin-add-user-to-group \
     --user-pool-id eu-north-1_e4j7eAxOe \
     --username your-username \
     --group-name Admins
   ```
2. Access `/api/uploads/admin/all` → should see ALL users' uploads
3. Access other users' files → should succeed

---

## 📊 Verification Checklist

- [ ] Terraform apply successful (8 tables + 1 bucket created)
- [ ] Backend dependencies installed
- [ ] Environment variables configured
- [ ] Auth middleware created
- [ ] Backend server starts without errors
- [ ] Frontend builds and runs
- [ ] File upload works
- [ ] File appears in S3 under `users/{user_id}/`
- [ ] Metadata saved in DynamoDB
- [ ] Download generates valid signed URL
- [ ] Delete removes from both S3 and DynamoDB
- [ ] User can only see their own files
- [ ] Admin can see all files (if tested)
- [ ] Category filter works (images, audio, all)

---

## 🎯 Next Steps

### Backend Routes to Create

Create these additional API routes:

1. **Artists** (`backend-api/routes/artists.js`):
   - POST /api/artists - Create artist
   - GET /api/artists - List artists
   - GET /api/artists/:id - Get artist details
   - PUT /api/artists/:id - Update artist
   - DELETE /api/artists/:id - Delete artist

2. **Albums** (`backend-api/routes/albums.js`):
   - POST /api/albums - Create album
   - GET /api/albums - List albums
   - GET /api/albums/:id - Get album details
   - PUT /api/albums/:id - Update album
   - DELETE /api/albums/:id - Delete album

3. **Songs** (`backend-api/routes/songs.js`):
   - POST /api/songs - Create song
   - GET /api/songs - List songs
   - GET /api/songs/:id - Get song details
   - PUT /api/songs/:id - Update song
   - DELETE /api/songs/:id - Delete song

4. **Blog** (`backend-api/routes/blog.js`):
   - POST /api/blog/posts - Create post
   - GET /api/blog/posts - List posts
   - GET /api/blog/posts/:id - Get post
   - PUT /api/blog/posts/:id - Update post
   - DELETE /api/blog/posts/:id - Delete post
   - POST /api/blog/posts/:id/comments - Add comment
   - GET /api/blog/posts/:id/comments - List comments

5. **Votes** (`backend-api/routes/votes.js`):
   - POST /api/votes - Create vote
   - GET /api/votes - List votes
   - GET /api/votes/:poll_id - Get poll results

### Frontend Updates

1. **Connect Admin Pages to Real APIs**:
   - Update `AddArtist.tsx` to use `POST /api/artists`
   - Update `AddAlbum.tsx` to use `POST /api/albums`
   - Update `AddSong.tsx` to use `POST /api/songs`

2. **Create Admin Dashboard** (`src/pages/AdminDashboard.tsx`):
   - View all uploads
   - View all blog posts
   - View all users
   - Manage content

3. **Update Existing Pages**:
   - `Artists.tsx` - Fetch from `GET /api/artists`
   - `Albums.tsx` - Fetch from `GET /api/albums`
   - `Songs.tsx` - Fetch from `GET /api/songs`
   - `Blog.tsx` - Fetch from `GET /api/blog/posts`

---

## 🐛 Troubleshooting

### Problem: "Failed to upload file"
**Solution:** Check:
- Backend is running on port 3000
- `USER_UPLOADS_BUCKET` env var is set correctly
- AWS credentials have S3 PutObject permission
- CORS configuration includes your frontend origin

### Problem: "Failed to list uploads"
**Solution:** Check:
- JWT token is valid (try logging out and back in)
- `USER_UPLOADS_TABLE` env var is correct
- DynamoDB table exists (check AWS console)
- AWS credentials have DynamoDB Query permission

### Problem: "Access denied" on download
**Solution:** Check:
- Signed URL hasn't expired (1 hour TTL)
- File still exists in S3
- S3 bucket policy allows GetObject

### Problem: Terraform apply fails
**Solution:** Check:
- AWS credentials are configured (`aws configure`)
- Region is set correctly (`eu-north-1`)
- No resource name conflicts
- Sufficient permissions to create DynamoDB tables and S3 buckets

### Problem: Files not showing in MyUploads page
**Solution:** Check:
- User is authenticated (check browser console for JWT token)
- Backend `/api/uploads` endpoint is accessible
- DynamoDB UserUploadsIndex exists
- Network tab shows 200 response from API

---

## 📚 Resources

- [AWS DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [AWS Cognito JWT Verification](https://github.com/awslabs/aws-jwt-verify)
- [Multer Documentation](https://github.com/expressjs/multer)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

## ✅ Summary

You've successfully implemented:
- ✅ 8 DynamoDB tables for data persistence
- ✅ S3 bucket for user uploads with 30-day TTL
- ✅ Backend API for file upload management
- ✅ Frontend page for user upload dashboard
- ✅ Access control (user vs admin)
- ✅ Signed URL generation for secure downloads
- ✅ Category filtering
- ✅ CRUD operations for uploads

**Total Infrastructure:**
- 2 S3 buckets
- 9 DynamoDB tables (1 existing + 8 new)
- Complete REST API for uploads
- Protected frontend routes
- JWT authentication
- Admin capabilities

Ready to scale to thousands of users! 🚀
