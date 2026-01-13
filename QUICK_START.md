# 🚀 Quick Start Commands

This file contains all the commands you need to deploy the user uploads system.

## 📋 Prerequisites Check

```bash
# Check AWS CLI is installed
aws --version

# Check Terraform is installed
terraform --version

# Check Node.js is installed
node --version

# Check npm is installed
npm --version
```

## 🏗️ Step 1: Deploy Infrastructure

```bash
# Navigate to terraform directory
cd terraform

# Initialize Terraform (first time only)
terraform init

# Review what will be created
terraform plan

# Apply infrastructure (creates 8 DynamoDB tables + 1 S3 bucket)
terraform apply

# Note the outputs - you'll need these for .env
terraform output

# Go back to root
cd ..
```

Expected output:
```
Apply complete! Resources: 15 added, 0 changed, 0 destroyed.

Outputs:

cognito_client_id = "nqvnmimojggjpuvfk0cldeu2t"
cognito_user_pool_id = "eu-north-1_e4j7eAxOe"
dynamodb_tables = {
  "albums" = "lyricscape-albums-prod"
  "artists" = "lyricscape-artists-prod"
  "blog_comments" = "lyricscape-blog-comments-prod"
  "blog_posts" = "lyricscape-blog-posts-prod"
  "songs" = "lyricscape-songs-prod"
  "user_uploads" = "lyricscape-user-uploads-prod"
  "users_profile" = "lyricscape-users-profile-prod"
  "votes" = "lyricscape-votes-prod"
}
s3_bucket_name = "lyricscape-lyrics-images-prod"
user_uploads_bucket_name = "lyricscape-user-uploads-prod"
```

## 📦 Step 2: Install Backend Dependencies

```bash
# Navigate to backend
cd backend-api

# Install new dependencies
npm install multer @aws-sdk/lib-dynamodb @aws-sdk/s3-request-presigner aws-jwt-verify

# Verify package.json was updated
cat package.json
```

## ⚙️ Step 3: Configure Environment

```bash
# Still in backend-api directory

# Copy example to create .env
cp .env.example .env

# Edit .env with your values
# On Windows PowerShell:
notepad .env

# On Linux/Mac:
nano .env
```

**Fill in these values:**

```env
# AWS Configuration
AWS_REGION=eu-north-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# Legacy S3 Bucket
S3_BUCKET_NAME=lyricscape-lyrics-images-prod

# User Uploads S3 Bucket (from terraform output)
USER_UPLOADS_BUCKET=lyricscape-user-uploads-prod

# DynamoDB Tables (from terraform output)
DYNAMODB_TABLE_NAME=lyricscape-instagram-uploads-prod
USER_UPLOADS_TABLE=lyricscape-user-uploads-prod
USERS_PROFILE_TABLE=lyricscape-users-profile-prod
BLOG_POSTS_TABLE=lyricscape-blog-posts-prod
BLOG_COMMENTS_TABLE=lyricscape-blog-comments-prod
VOTES_TABLE=lyricscape-votes-prod
ARTISTS_TABLE=lyricscape-artists-prod
ALBUMS_TABLE=lyricscape-albums-prod
SONGS_TABLE=lyricscape-songs-prod

# Cognito Configuration (from terraform output)
COGNITO_USER_POOL_ID=eu-north-1_e4j7eAxOe
COGNITO_CLIENT_ID=nqvnmimojggjpuvfk0cldeu2t

# Server Configuration
PORT=3000
```

## 🚀 Step 4: Start Backend Server

```bash
# Still in backend-api directory

# Start server
node server.js
```

Expected output:
```
🚀 Backend API running on port 3000
📦 S3 Bucket: lyricscape-lyrics-images-prod
🗄️  DynamoDB Table: lyricscape-instagram-uploads-prod
```

Keep this terminal open!

## 🎨 Step 5: Start Frontend (New Terminal)

```bash
# Open new terminal
# Navigate to project root
cd c:\git\lyrics\lyricscape-creations

# Start Vite dev server
npm run dev
```

Expected output:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:8089/
➜  Network: use --host to expose
```

## ✅ Step 6: Test the System

### 6.1 Sign In

1. Open browser: http://localhost:8089
2. Click "Sign In"
3. Use your credentials or Google OAuth

### 6.2 Test File Upload

1. Navigate to "My Uploads" in the nav menu (or go to http://localhost:8089/my-uploads)
2. Click "Upload File"
3. Select an image or audio file
4. Wait for success toast
5. File should appear in the grid

### 6.3 Verify in AWS Console

**Check S3:**
```bash
# List files in user uploads bucket
aws s3 ls s3://lyricscape-user-uploads-prod/ --recursive
```

Expected output:
```
2024-01-15 10:30:00    1234567  users/abc123-def456-ghi789/general/upload123-filename.jpg
```

**Check DynamoDB:**
```bash
# Scan user_uploads table
aws dynamodb scan --table-name lyricscape-user-uploads-prod --limit 5
```

### 6.4 Test Download

1. Click "Download" button on any file
2. File should download via signed URL
3. File should be identical to original

### 6.5 Test Delete

1. Click delete button (trash icon)
2. Confirm deletion
3. File should disappear from list
4. Verify removed from S3 and DynamoDB

## 🔐 Step 7: Test Admin Access (Optional)

### 7.1 Add User to Admins Group

```bash
# Replace YOUR_USERNAME with your actual username
aws cognito-idp admin-add-user-to-group \
  --user-pool-id eu-north-1_e4j7eAxOe \
  --username YOUR_USERNAME \
  --group-name Admins
```

### 7.2 Test Admin Endpoint

```bash
# Get your JWT token from browser (Developer Tools → Application → Local Storage)
# Replace YOUR_TOKEN with actual token

curl http://localhost:3000/api/uploads/admin/all \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Should return all uploads from all users.

## 🧪 Troubleshooting Commands

### Check Backend is Running

```bash
# Test health endpoint
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "s3Bucket": "lyricscape-lyrics-images-prod",
  "dynamoTable": "lyricscape-instagram-uploads-prod"
}
```

### Check AWS Credentials

```bash
# Test AWS CLI access
aws sts get-caller-identity
```

Expected response:
```json
{
  "UserId": "AIDACKCEVSQ6C2EXAMPLE",
  "Account": "123456789012",
  "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

### Check DynamoDB Tables Exist

```bash
# List all DynamoDB tables
aws dynamodb list-tables --region eu-north-1
```

Should include:
```json
{
  "TableNames": [
    "lyricscape-albums-prod",
    "lyricscape-artists-prod",
    "lyricscape-blog-comments-prod",
    "lyricscape-blog-posts-prod",
    "lyricscape-instagram-uploads-prod",
    "lyricscape-songs-prod",
    "lyricscape-user-uploads-prod",
    "lyricscape-users-profile-prod",
    "lyricscape-votes-prod"
  ]
}
```

### Check S3 Buckets Exist

```bash
# List all S3 buckets
aws s3 ls
```

Should include:
```
2024-01-15 10:00:00 lyricscape-lyrics-images-prod
2024-01-15 10:30:00 lyricscape-user-uploads-prod
```

### View Backend Logs

Backend logs appear in the terminal where you ran `node server.js`.

Common errors:
- "Missing required environment variables" → Check .env file
- "Token verification failed" → Check Cognito config or re-login
- "Failed to upload" → Check AWS credentials and S3 permissions

### Test Upload API Manually

```bash
# Create a test file
echo "test content" > test.txt

# Upload via curl (replace YOUR_TOKEN)
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.txt" \
  -F "category=documents" \
  -F "visibility=private"
```

### Check Frontend Console

Open browser Developer Tools (F12) → Console tab

Look for:
- Network errors (check Network tab)
- CORS errors
- 401 Unauthorized (need to re-login)
- 403 Forbidden (permission issue)

## 🛑 Stop Services

### Stop Backend
In the backend terminal, press: `Ctrl + C`

### Stop Frontend
In the frontend terminal, press: `Ctrl + C`

## 🗑️ Cleanup (Destroy Infrastructure)

**⚠️ WARNING: This will delete all data!**

```bash
cd terraform

# Destroy all resources
terraform destroy
```

Type `yes` to confirm.

This will delete:
- 8 DynamoDB tables (and all data)
- 1 S3 bucket (and all files)
- All associated configurations

## 📋 Daily Development Workflow

```bash
# Start backend (terminal 1)
cd c:\git\lyrics\lyricscape-creations\backend-api
node server.js

# Start frontend (terminal 2)
cd c:\git\lyrics\lyricscape-creations
npm run dev

# Make code changes
# Both servers will auto-reload (Vite has HMR)

# Test changes in browser
# http://localhost:8089

# When done, stop both servers (Ctrl+C in each terminal)
```

## 🔄 After Making Backend Changes

```bash
# Backend doesn't auto-reload, so restart it:
# In backend terminal, press Ctrl+C, then:
node server.js
```

## 🔄 After Making Frontend Changes

Frontend auto-reloads via Vite HMR, no restart needed!

## 📊 Useful AWS Console Links

- **S3 Buckets:** https://s3.console.aws.amazon.com/s3/buckets?region=eu-north-1
- **DynamoDB Tables:** https://eu-north-1.console.aws.amazon.com/dynamodbv2/home?region=eu-north-1#tables
- **Cognito User Pools:** https://eu-north-1.console.aws.amazon.com/cognito/v2/idp/user-pools?region=eu-north-1
- **CloudWatch Logs:** https://eu-north-1.console.aws.amazon.com/cloudwatch/home?region=eu-north-1#logsV2:log-groups

## 🎉 Success Indicators

You know everything is working when:
- ✅ Backend starts without errors
- ✅ Frontend loads at localhost:8089
- ✅ You can sign in with email or Google
- ✅ My Uploads page loads
- ✅ File upload succeeds
- ✅ File appears in grid
- ✅ Download button works
- ✅ Delete button works
- ✅ Files visible in AWS S3 console
- ✅ Metadata in DynamoDB console

## 📚 Next Steps

After successful deployment:
1. Read IMPLEMENTATION_GUIDE.md for advanced features
2. Create backend routes for artists, albums, songs
3. Connect admin pages to real APIs
4. Create admin dashboard
5. Add more features!

---

**Need help?** Check:
- IMPLEMENTATION_GUIDE.md (detailed guide)
- SUMMARY.md (architecture overview)
- AUTH_TESTING_GUIDE.md (authentication help)
- ADMIN_PAGES_GUIDE.md (admin features)
