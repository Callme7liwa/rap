# User Profiles Table Architecture

## Overview
Created a **DynamoDB user profiles table** as an application layer on top of AWS Cognito authentication. This provides better separation of concerns and performance.

## Architecture Decision

### Why Separate User Profiles Table?

**Before**: Tried to store user profile data (name, picture) directly in Cognito attributes
- ❌ Required special token scopes (`aws.cognito.signin.user.admin`)
- ❌ Complex token management
- ❌ Access token couldn't read user attributes
- ❌ Frontend had to call Cognito APIs directly

**After**: User profiles table in DynamoDB
- ✅ Cognito handles authentication only (what it's designed for)
- ✅ DynamoDB handles application data (user profiles)
- ✅ Simple REST API for profile CRUD operations
- ✅ No token scope issues
- ✅ Better performance with caching

## Database Schema

### Table: `lyricscape-user-profiles-prod`

```javascript
{
  user_id: "cognito-user-sub",      // Primary Key (from Cognito)
  display_name: "John Doe",         // User's chosen display name
  profile_picture: "https://...",   // URL to S3 image
  bio: "Software developer...",     // User bio (optional)
  created_at: 1234567890,           // Timestamp
  updated_at: 1234567890            // Timestamp
}
```

**Key Points:**
- `user_id` is the Cognito `sub` (unique user identifier)
- DynamoDB is schemaless - attributes added on first save
- No migration needed for existing users
- Pay-per-request billing mode

## API Endpoints

### GET /api/user/profile
**Get current user's profile**

**Auth**: Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "profile": {
    "user_id": "...",
    "email": "user@example.com",
    "display_name": "John Doe",
    "profile_picture": "https://...",
    "bio": "...",
    "created_at": 1234567890,
    "updated_at": 1234567890
  }
}
```

**Behavior:**
- If no profile exists, returns default from Cognito token
- Email always comes from Cognito (read-only)
- Creates profile on first access

### PUT /api/user/profile
**Update current user's profile**

**Auth**: Required (Bearer token)

**Request Body:**
```json
{
  "display_name": "John Doe",
  "profile_picture": "https://...",
  "bio": "Software developer"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "profile": {
    "user_id": "...",
    "email": "user@example.com",
    "display_name": "John Doe",
    "profile_picture": "https://...",
    "bio": "...",
    "updated_at": 1234567890
  }
}
```

**Validation:**
- `display_name` is required
- `profile_picture` and `bio` are optional
- Auto-creates profile if doesn't exist

### GET /api/user/profile/:userId
**Get any user's public profile**

**Auth**: Not required (public endpoint)

**Response:**
```json
{
  "success": true,
  "profile": {
    "user_id": "...",
    "display_name": "John Doe",
    "profile_picture": "https://...",
    "bio": "...",
    "created_at": 1234567890
  }
}
```

**Note:** Email is NOT included (privacy)

## Comment Integration

### When Creating Comments

**Old Flow:**
```javascript
// Tried to get name/picture from Cognito token
const userName = req.user.name;  // Not always available
const userPicture = req.user.picture;  // Token scope issues
```

**New Flow:**
```javascript
// Fetch from user profiles table
const profileResult = await dynamoClient.send(new GetCommand({
  TableName: USER_PROFILES_TABLE,
  Key: { user_id: userId }
}));

const userName = profileResult.Item?.display_name || 'User';
const userPicture = profileResult.Item?.profile_picture || '';

// Store in comment
const comment = {
  ...
  user_name: userName,
  user_picture: userPicture
};
```

### When Displaying Comments

**Backend enriches comments with latest profile data:**
```javascript
router.get('/:slug/comments', async (req, res) => {
  // Get comments
  const comments = await getCommentsFromDB();
  
  // Enrich each comment with latest profile
  const enrichedComments = await Promise.all(comments.map(async (comment) => {
    const profile = await getUserProfile(comment.user_id);
    return {
      ...comment,
      user_name: profile.display_name,
      user_picture: profile.profile_picture
    };
  }));
  
  res.json({ comments: enrichedComments });
});
```

**Benefits:**
- Old comments show updated user names/pictures
- One profile change updates all comments
- Fast parallel fetching with `Promise.all()`

## Data Flow

### Profile Update Flow

```
User Profile Page
       ↓
  PUT /api/user/profile
       ↓
  Backend validates data
       ↓
  Save to DynamoDB (user_profiles_table)
       ↓
  Return updated profile
       ↓
  Frontend updates UI
```

### Comment Display Flow

```
Blog Post Page loads
       ↓
  GET /api/blog/:slug/comments
       ↓
  Fetch comments from comments_table
       ↓
  For each comment:
    - Fetch user profile from profiles_table
    - Merge profile data with comment
       ↓
  Return enriched comments
       ↓
  Frontend displays with real names/pictures
```

## Files Created/Modified

### Backend

**Created:**
- `routes/user-profile.js` - User profile CRUD API
- `scripts/create-user-profiles-table.js` - Table creation script

**Modified:**
- `server.js` - Added `/api/user/profile` route
- `routes/blog-interactions.js` - Fetch profiles when creating/displaying comments
- `middleware/auth.js` - Extract basic user info from token

### Frontend

**Modified:**
- `src/pages/UserProfile.tsx` - Complete rewrite to use new API
- `src/lib/blog-api.ts` - Simplified (removed Cognito calls)

## Environment Variables

```env
USER_PROFILES_TABLE=lyricscape-user-profiles-prod
```

Add to `.env` files (already using default value in code).

## Migration Strategy

### For Existing Users

**No migration required!** The system handles users without profiles:

1. **First profile access:**
   - Backend checks if profile exists
   - If not, returns default from Cognito token
   - User can then update their profile

2. **First comment:**
   - Backend tries to fetch profile
   - If doesn't exist, uses fallback from token
   - Comment still saves successfully

3. **Old comments:**
   - Backend enriches with latest profile data
   - If no profile exists, uses cached data from comment
   - Graceful degradation ensures no errors

## Performance Optimizations

### 1. Parallel Profile Fetching
```javascript
// Fetch all profiles in parallel
const comments = await Promise.all(
  commentsList.map(async (comment) => {
    const profile = await getUserProfile(comment.user_id);
    return { ...comment, ...profile };
  })
);
```

### 2. Profile Caching
```javascript
// Cache profiles in comment records
const comment = {
  user_name: userName,      // Cached at creation time
  user_picture: userPicture // Fast access on read
};
```

### 3. Optional Enrichment
```javascript
// Frontend can use cached data if available
const displayName = comment.user_name || 'User';
const displayPicture = comment.user_picture || '/placeholder.svg';
```

## Security Considerations

### 1. Authentication
- Profile updates require valid JWT token
- User can only update their own profile
- Public profiles don't expose email

### 2. Authorization
```javascript
router.put('/', verifyToken, async (req, res) => {
  const userId = req.user.sub;  // From verified token
  // User can only update their own profile
});
```

### 3. Data Validation
```javascript
if (!display_name || display_name.trim() === '') {
  return res.status(400).json({ error: 'Display name is required' });
}
```

### 4. Privacy
- Email NOT included in public profile endpoint
- User ID is opaque (Cognito sub)
- Bio is optional

## Testing

### Manual Tests

1. **Create Profile:**
   ```bash
   curl -X PUT http://localhost:3000/api/user/profile \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"display_name":"John Doe","bio":"Hello world"}'
   ```

2. **Get Profile:**
   ```bash
   curl http://localhost:3000/api/user/profile \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **Get Public Profile:**
   ```bash
   curl http://localhost:3000/api/user/profile/USER_ID
   ```

4. **Post Comment:**
   ```bash
   curl -X POST http://localhost:3000/api/blog/post-slug/comment \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"content":"Great post!"}'
   ```

5. **Get Comments:**
   ```bash
   curl http://localhost:3000/api/blog/post-slug/comments
   ```

### Integration Tests

- [x] User can create profile
- [x] User can update profile
- [x] Profile updates appear in new comments
- [x] Old comments show updated profile data
- [x] Public profile endpoint works
- [x] Email remains private
- [x] Unauthenticated users can read comments

## Troubleshooting

### Profile not updating

**Issue:** Changes don't appear in comments

**Solution:** Check that:
1. Profile saved successfully (`PUT /api/user/profile` returns success)
2. Backend is fetching from `USER_PROFILES_TABLE`
3. Table name environment variable is correct

### Comments show "User" instead of real name

**Issue:** Display name not appearing

**Solution:**
1. Check user has created profile (visit `/user/profile` page)
2. Verify profile has `display_name` field
3. Check backend logs for profile fetch errors

### Token authentication errors

**Issue:** 401 Unauthorized when updating profile

**Solution:**
1. Ensure user is signed in
2. Check token is being sent in Authorization header
3. Verify Cognito configuration in `.env`

## Comparison: Before vs After

### Before (Cognito Attributes)

**Pros:**
- Single source of truth
- Integrated with authentication

**Cons:**
- ❌ Token scope issues (`NotAuthorizedException`)
- ❌ Can't read attributes with access token
- ❌ Complex token management
- ❌ API rate limits for Cognito calls
- ❌ Tight coupling with auth provider

### After (DynamoDB Table)

**Pros:**
- ✅ No token scope issues
- ✅ Simple REST API
- ✅ Fast performance with caching
- ✅ Separation of concerns
- ✅ Flexible schema for future features
- ✅ Can switch auth providers easily

**Cons:**
- Additional database table (minimal)
- Slight data duplication (acceptable)

## Future Enhancements

### Planned Features

1. **User Following/Followers**
   ```javascript
   {
     following: ['user_id_1', 'user_id_2'],
     followers_count: 42
   }
   ```

2. **Profile Stats**
   ```javascript
   {
     total_posts: 10,
     total_comments: 50,
     likes_received: 123
   }
   ```

3. **Social Links**
   ```javascript
   {
     social_links: {
       twitter: 'https://...',
       github: 'https://...',
       website: 'https://...'
     }
   }
   ```

4. **Profile Verification**
   ```javascript
   {
     verified: true,
     verification_date: 1234567890
   }
   ```

5. **Privacy Settings**
   ```javascript
   {
     privacy: {
       show_email: false,
       show_activity: true,
       allow_comments: true
     }
   }
   ```

## Conclusion

✅ **Successfully implemented user profiles table**
✅ **No token scope issues**
✅ **Clean separation: Cognito = auth, DynamoDB = data**
✅ **Comments now show real user names and pictures**
✅ **Profile updates propagate to all comments**
✅ **Backwards compatible with existing data**

The architecture is now scalable, maintainable, and follows best practices for separating authentication from application data.

---

**Created:** October 12, 2025
**Status:** ✅ Production Ready
**Table:** `lyricscape-user-profiles-prod` (live)
