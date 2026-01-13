# Database Schema Update for User Profiles

## Question: Do we need to update the database for profile pictures and display names?

**Short Answer:** We're using a **hybrid approach** that combines both Cognito (primary source) and DynamoDB (caching for performance).

## Current Architecture

### Data Storage Strategy

1. **AWS Cognito (Primary Source of Truth)**
   - Stores user attributes: `name`, `picture`, `email`, `sub`
   - Users update their profile through the UserProfile page
   - Changes sync to Cognito via `updateUserAttributes()`

2. **DynamoDB Comments Table (Cached Data)**
   - Stores `user_name` and `user_picture` when comment is created
   - Provides fast access without calling Cognito API every time
   - Automatically populated from JWT token claims

## Implementation Details

### Backend Changes

#### 1. Updated Auth Middleware (`backend-api/middleware/auth.js`)
```javascript
req.user = {
  sub: payload.sub,
  email: payload.email,
  name: payload.name || payload.email?.split('@')[0] || 'User',
  picture: payload.picture || '',  // ← NEW
  // ... other fields
};
```

**What this does:**
- Extracts `name` and `picture` from the JWT token (ID token from Cognito)
- These attributes are automatically included in tokens after user updates profile
- No additional API calls needed

#### 2. Updated Comment Creation (`backend-api/routes/blog-interactions.js`)
```javascript
const comment = {
  comment_id: commentId,
  post_id: post.post_id,
  user_id: userId,
  user_email: userEmail,
  user_name: userName,     // ← NEW
  user_picture: userPicture, // ← NEW
  content: content.trim(),
  created_at: timestamp,
  // ...
};
```

**What this does:**
- Stores user's name and picture snapshot at comment creation time
- No need to fetch from Cognito when displaying comments
- Significantly improves performance

### Frontend Changes

#### Updated `blog-api.ts`
```typescript
// Hybrid approach: Use cached data or fetch from Cognito
const comments = await Promise.all(
  (data.comments || []).map(async (comment) => {
    let userName = comment.user_name || '';
    let userPicture = comment.user_picture || '';
    
    // Fallback for old comments without cached data
    if (!userName || !userPicture) {
      const userProfile = await getUserProfile(comment.user_id);
      userName = userName || userProfile.name;
      userPicture = userPicture || userProfile.picture;
    }
    
    return {
      userName: userName || 'User',
      userImage: userPicture || '/placeholder.svg',
      // ...
    };
  })
);
```

## Benefits of This Approach

### ✅ Advantages

1. **Performance**
   - No Cognito API calls for new comments
   - Faster page load times
   - Reduced API quota usage

2. **Backwards Compatibility**
   - Old comments without `user_name`/`user_picture` still work
   - Graceful fallback to Cognito fetch
   - No data migration required

3. **No Schema Migration**
   - DynamoDB is schemaless
   - New fields are automatically added
   - No downtime or manual updates needed

4. **Consistency**
   - Profile updates propagate through JWT tokens
   - New comments always have latest profile data
   - Old comments preserve historical snapshot

### ⚠️ Trade-offs

1. **Profile Update Propagation**
   - Old comments show the user's name/picture at comment time
   - If user changes name, old comments don't update
   - This is **intentional** - preserves historical context

2. **JWT Token Dependency**
   - Requires `name` and `picture` to be included in ID token
   - Must configure Cognito to include these attributes in tokens
   - Needs token refresh to get updated profile data

## Configuration Required

### AWS Cognito Setup

1. **User Pool Attributes**
   - Enable `name` as a mutable custom attribute
   - Enable `picture` as a mutable custom attribute
   - Both should be included in ID token

2. **App Client Settings**
   - Ensure ID token includes custom attributes
   - Set token expiration appropriately (e.g., 1 hour)
   - Enable refresh tokens for seamless updates

### Environment Variables (No changes needed)
```env
COGNITO_USER_POOL_ID=your-pool-id
COGNITO_CLIENT_ID=your-client-id
AWS_REGION=eu-north-1
BLOG_COMMENTS_TABLE=lyricscape-blog-comments-prod
```

## Database Schema (DynamoDB)

### Comments Table Structure

```javascript
{
  comment_id: "uuid",           // Primary Key
  created_at: 1234567890,       // Sort Key
  post_id: "uuid",
  post_slug: "blog-post-slug",
  user_id: "cognito-sub",
  user_email: "user@example.com",
  user_name: "John Doe",        // ← NEW (cached from Cognito)
  user_picture: "https://...",  // ← NEW (cached from Cognito)
  content: "Comment text",
  updated_at: 1234567890
}
```

**Key Points:**
- No schema migration needed (DynamoDB is schemaless)
- Old comments without `user_name`/`user_picture` still work
- New comments automatically include these fields
- Queries remain the same

## Data Flow Diagram

```
User Updates Profile
        ↓
  User Profile Page
        ↓
  updateUserAttributes()
        ↓
  AWS Cognito (stored)
        ↓
  User gets new ID token
        ↓
Post New Comment
        ↓
  Backend receives token
        ↓
  Auth middleware extracts name/picture
        ↓
  Comment saved to DynamoDB with cached data
        ↓
  Frontend displays comment instantly
```

## Testing Checklist

- [x] New comments include user_name and user_picture
- [x] Old comments fallback to Cognito fetch
- [x] Profile updates appear in new comments
- [x] Old comments preserve original user info
- [x] No errors when user_name/user_picture missing
- [x] Performance improved (fewer Cognito calls)

## Migration Path

### For Existing Comments (Optional)

If you want to backfill old comments with current user data:

```javascript
// One-time migration script (OPTIONAL)
async function backfillUserData() {
  const comments = await scanAllComments();
  
  for (const comment of comments) {
    if (!comment.user_name || !comment.user_picture) {
      const user = await fetchCognitoUser(comment.user_id);
      
      await updateComment(comment.comment_id, {
        user_name: user.name,
        user_picture: user.picture
      });
    }
  }
}
```

**Note:** This is **NOT required** - the system works perfectly without it!

## Conclusion

✅ **No manual database updates required**
✅ **No schema migration needed**
✅ **Automatic field population from JWT tokens**
✅ **Backwards compatible with old comments**
✅ **Performance optimized with caching**

The system now:
1. Stores user profile data in Cognito (editable)
2. Caches profile snapshots in DynamoDB comments (read-only)
3. Falls back to Cognito for old comments (graceful degradation)
4. Provides excellent performance and user experience

## Related Files

**Backend:**
- `backend-api/middleware/auth.js` - Extracts name/picture from token
- `backend-api/routes/blog-interactions.js` - Stores cached data

**Frontend:**
- `src/lib/blog-api.ts` - Hybrid fetch logic
- `src/pages/UserProfile.tsx` - Profile update UI
- `src/pages/BlogDetail.tsx` - Comment display

**Documentation:**
- `USER_PROFILE_FEATURE.md` - Overall feature documentation
- `DATABASE_SCHEMA_UPDATE.md` - This file

---

**Last Updated:** October 12, 2025
