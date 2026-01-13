# Authentication Fix - Artist Content Editing

## Problem
Getting 401 Unauthorized error when trying to update artist profiles, songs, or albums.

## Root Causes Identified

### 1. **Missing Fields in Backend**
The `/api/artist-profile/me` PUT endpoint was only accepting:
- `description_preview`
- `description_html`
- `description_markdown`
- Social media fields

But the frontend was sending:
- `name`
- `image_url`
- `header_image_url`
- `description` (maps to description_preview)

**Fix**: Updated `backend-api/routes/artist-profile.js` to accept all fields.

### 2. **Token Management**
Old implementation was using `localStorage.getItem('token')` which could be:
- Expired
- Stale
- Not refreshed automatically

**Fix**: Created `src/lib/auth-helper.ts` with:
- Automatic token refresh via `fetchAuthSession()`
- Fallback to localStorage if session fails
- Retry logic for 401 errors (auto-refresh and retry once)
- Uses ID token (preferred) with access token fallback

## Files Changed

### Backend
1. **`backend-api/routes/artist-profile.js`**
   - Added support for `name`, `description`, `image_url`, `header_image_url`
   - Fixed UpdateExpression to handle all artist profile fields

### Frontend
1. **`src/lib/auth-helper.ts`** (NEW)
   - `getAuthToken()` - Gets fresh token with automatic refresh
   - `authenticatedFetch()` - Wrapper for fetch with auth headers and retry logic

2. **`src/pages/EditArtist.tsx`**
   - Uses `authenticatedFetch()` instead of manual token handling
   - Better error messages from API

3. **`src/pages/EditSong.tsx`**
   - Uses `authenticatedFetch()` for both update and delete
   - Automatic token refresh

4. **`src/pages/EditAlbum.tsx`**
   - Uses `authenticatedFetch()` for both update and delete
   - Automatic token refresh

## How It Works Now

```typescript
// Old way (prone to 401 errors)
const token = localStorage.getItem('token');
fetch(url, {
  headers: { 'Authorization': `Bearer ${token}` }
});

// New way (automatic refresh + retry)
import { authenticatedFetch } from '@/lib/auth-helper';
authenticatedFetch(url, { method: 'PUT', body: JSON.stringify(data) });
```

## Testing

1. **Login** to the app
2. **Navigate** to an artist/song/album you own
3. **Click Edit** button
4. **Make changes** and click Save
5. **Should succeed** with success toast
6. If token expired:
   - System automatically refreshes token
   - Retries the request once
   - If still fails, shows clear error message

## Token Lifecycle

1. User logs in → Amplify stores tokens
2. Edit page loads → Calls `fetchAuthSession()` to get fresh token
3. Token cached in localStorage for quick access
4. On API call:
   - Get fresh token via `getAuthToken()`
   - If 401 response → Clear cache, fetch new token, retry once
   - If success → Continue
   - If failure → Show error to user

## Debugging Tips

If still getting 401 errors:

1. **Check Console Logs**:
   ```
   [Auth] User authenticated: { sub: '...', username: '...' }
   ```

2. **Check Token**:
   ```javascript
   import { fetchAuthSession } from 'aws-amplify/auth';
   const session = await fetchAuthSession();
   console.log('ID Token:', session.tokens?.idToken?.toString());
   console.log('Token Expiry:', new Date(session.tokens?.idToken?.payload.exp * 1000));
   ```

3. **Check Backend Logs**:
   - Look for "Token verification failed" or "Invalid or expired token"

4. **Check Association**:
   ```bash
   node backend-api/scripts/test-artist-ownership.js
   ```

5. **Manual Test**:
   ```bash
   # Get token from browser console localStorage.getItem('token')
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/artist-profile/me
   ```

## API Endpoints Used

- `GET /api/artist-profile/me` - Get owned artist profile
- `PUT /api/artist-profile/me` - Update artist profile
- `PUT /api/artist-content/songs/:id` - Update song
- `DELETE /api/artist-content/songs/:id` - Delete song  
- `PUT /api/artist-content/albums/:id` - Update album
- `DELETE /api/artist-content/albums/:id` - Delete album

All require:
- Valid JWT token (ID or Access token)
- User associated with artist (checked via `lyricscape-artist-users-prod` table)
- Ownership verified by middleware

## Environment Variables Required

Backend (.env):
```
COGNITO_USER_POOL_ID=eu-north-1_xxx
COGNITO_CLIENT_ID=xxx
AWS_REGION=eu-north-1
```

Frontend (.env):
```
VITE_COGNITO_USER_POOL_ID=eu-north-1_xxx
VITE_COGNITO_CLIENT_ID=xxx
VITE_AWS_REGION=eu-north-1
VITE_API_BASE=http://localhost:3000
```
