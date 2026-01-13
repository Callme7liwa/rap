# S3 Bucket Setup for Profile Pictures

## Problem: ACL Not Supported

**Error:**
```
AccessControlListNotSupported: The bucket does not allow ACLs
```

**Cause:** Modern S3 buckets have ACLs disabled by default (recommended by AWS). Instead, we use **bucket policies** for access control.

## Solution: Bucket Policy

Instead of using ACLs (`public-read`), we configure a bucket policy that allows public read access to profile pictures only.

## Quick Fix

### Option 1: Run Setup Script (Recommended)

```bash
cd backend-api
node scripts/setup-s3-bucket-policy.js
```

This script automatically configures your bucket with the correct policy.

### Option 2: Manual AWS Console Setup

1. **Go to S3 Console**
   - Navigate to: https://s3.console.aws.amazon.com/
   - Select bucket: `lyricscape-user-uploads-prod`

2. **Edit Bucket Policy**
   - Click "Permissions" tab
   - Scroll to "Bucket policy"
   - Click "Edit"

3. **Paste This Policy**
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadProfilePictures",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::lyricscape-user-uploads-prod/users/*/profile-pictures/*"
       }
     ]
   }
   ```

4. **Save Changes**

### Option 3: AWS CLI

```bash
aws s3api put-bucket-policy \
  --bucket lyricscape-user-uploads-prod \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Sid": "PublicReadProfilePictures",
        "Effect": "Allow",
        "Principal": "*",
        "Action": "s3:GetObject",
        "Resource": "arn:aws:s3:::lyricscape-user-uploads-prod/users/*/profile-pictures/*"
      }
    ]
  }'
```

## What This Policy Does

### 🔓 **Public Access (Read-Only)**
```
✅ users/{userId}/profile-pictures/*.jpg
✅ users/{userId}/profile-pictures/*.png
✅ users/{userId}/profile-pictures/*.gif
```
Anyone can VIEW these files via public URL.

### 🔒 **Private Access**
```
❌ users/{userId}/documents/*
❌ users/{userId}/general/*
❌ Any other path
```
Only authenticated requests can access these files.

## How It Works

### Before (ACL-Based - Not Supported)
```javascript
await s3Client.send(new PutObjectCommand({
  ACL: 'public-read',  // ❌ Error: ACLs not supported
  // ...
}));
```

### After (Policy-Based - Working)
```javascript
await s3Client.send(new PutObjectCommand({
  // No ACL specified ✅
  // Public access controlled by bucket policy
  // ...
}));
```

The bucket policy automatically makes all files in `users/*/profile-pictures/*` publicly readable.

## Testing

### 1. Upload a Profile Picture
```bash
curl -X POST http://localhost:3000/api/uploads \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.jpg" \
  -F "category=profile-pictures" \
  -F "visibility=public"
```

**Expected Response:**
```json
{
  "success": true,
  "upload": {
    "url": "https://lyricscape-user-uploads-prod.s3.eu-north-1.amazonaws.com/users/abc123/profile-pictures/def456.jpg"
  }
}
```

### 2. Test Public Access
```bash
curl -I "https://lyricscape-user-uploads-prod.s3.eu-north-1.amazonaws.com/users/abc123/profile-pictures/def456.jpg"
```

**Expected:** `HTTP/1.1 200 OK`

### 3. Test in Browser
Open the URL in a browser - image should display without authentication.

## Troubleshooting

### Error: NoSuchBucket
**Problem:** Bucket doesn't exist

**Solution:**
```bash
# Create bucket
aws s3 mb s3://lyricscape-user-uploads-prod --region eu-north-1
```

### Error: AccessDenied (when setting policy)
**Problem:** Your IAM user/role lacks permissions

**Solution:** Add this IAM policy to your user:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutBucketPolicy",
        "s3:GetBucketPolicy"
      ],
      "Resource": "arn:aws:s3:::lyricscape-user-uploads-prod"
    }
  ]
}
```

### Error: 403 Forbidden (when accessing file)
**Problem:** Bucket policy not applied or incorrect

**Checklist:**
1. Verify bucket policy is set (use script or AWS Console)
2. Check file path matches pattern: `users/*/profile-pictures/*`
3. Wait 1-2 minutes for policy to propagate
4. Clear browser cache

### Files Still Not Public
**Problem:** Block Public Access settings

**Solution:**
1. Go to S3 Console → Select bucket
2. Click "Permissions" tab
3. Scroll to "Block public access"
4. Click "Edit"
5. **Uncheck** "Block all public access"
   - Keep checked: "Block public access to buckets and objects granted through new ACLs"
   - **Uncheck**: "Block public access to buckets and objects granted through any access control lists (ACLs)"
   - **Uncheck**: "Block public and cross-account access to buckets and objects through any public bucket or access point policies"
6. Save changes
7. Confirm by typing "confirm"

## Security Considerations

### ✅ Safe
- Only profile pictures are public (`users/*/profile-pictures/*`)
- Specific path restriction prevents accidental exposure
- Users can only upload to their own folders
- Backend validates user identity from JWT token

### ⚠️ Important Notes
1. **Don't upload sensitive data as profile pictures**
2. **Validate file types** (images only)
3. **Limit file sizes** (5MB max recommended)
4. **User isolation** (each user has separate folder)

## Alternative: CloudFront Distribution (Optional)

For better performance and security, use CloudFront:

### Benefits
- ✅ Faster global delivery (CDN)
- ✅ HTTPS by default
- ✅ DDoS protection
- ✅ Custom domain support
- ✅ Lower S3 costs

### Setup
1. Create CloudFront distribution
2. Origin: S3 bucket
3. Origin Path: `/users`
4. Viewer Protocol: Redirect HTTP to HTTPS
5. Update code to use CloudFront URL

```javascript
// Instead of S3 URL
const fileUrl = `https://${BUCKET}.s3.${REGION}.amazonaws.com/${s3Key}`;

// Use CloudFront URL
const fileUrl = `https://d123456789abcd.cloudfront.net/${s3Key}`;
```

## Environment Variables

```env
# Required
USER_UPLOADS_BUCKET=lyricscape-user-uploads-prod
AWS_REGION=eu-north-1

# Optional (if using CloudFront)
CLOUDFRONT_DOMAIN=d123456789abcd.cloudfront.net
```

## Summary

### What Changed

**Before:**
```javascript
ACL: 'public-read'  // ❌ Not supported by bucket
```

**After:**
```javascript
// No ACL specified
// Bucket policy controls access ✅
```

### Setup Steps

1. ✅ Remove ACL from upload code (done)
2. ✅ Create bucket policy script (done)
3. 🔄 **Run the script:** `node scripts/setup-s3-bucket-policy.js`
4. ✅ Test profile picture upload
5. ✅ Verify public access works

### Files Modified

- `backend-api/routes/uploads.js` - Removed ACL parameter
- `backend-api/scripts/setup-s3-bucket-policy.js` - New script to configure bucket

### Next Steps

Run the setup script:
```bash
cd backend-api
node scripts/setup-s3-bucket-policy.js
```

Then test uploading a profile picture! 🎉

---

**Status:** ✅ Code Fixed, ⏳ Bucket Policy Needs Setup
**Action Required:** Run setup script or manually configure bucket policy
**Documentation:** Complete
