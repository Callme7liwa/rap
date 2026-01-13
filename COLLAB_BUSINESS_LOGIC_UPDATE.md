# 🎯 Collaboration Request System - Business Logic Update

## Changes Made

### Updated Business Logic

**Previous:** All users had a limit of 2 collaboration requests per month.

**New:** 
- ✅ **Artists** (users associated with an artist profile) have **UNLIMITED** collaboration requests
- ✅ **Regular fans/users** have a limit of **2 requests per month**

---

## Why This Makes Sense

### For Artists:
- Artists need to collaborate with other artists frequently
- Artist-to-artist collaboration is a professional networking activity
- Should not be artificially limited by the same rules as fans

### For Fans:
- 2/month limit prevents spam
- Ensures quality, thoughtful collaboration requests
- Fair for all regular users

---

## Technical Implementation

### Backend Changes

#### 1. Updated `checkMonthlyLimit()` Function
**File:** `backend-api/routes/collab-requests.js`

The function now:
1. Checks if user is associated with an artist in `lyricscape-artist-users-prod` table
2. If user is an artist: Returns unlimited limit
3. If user is a fan: Returns 2/month limit

```javascript
// New response format for artists:
{
  count: 0,
  limit: 'unlimited',
  remaining: 'unlimited',
  canRequest: true,
  resetDate: null,
  isArtist: true
}

// Response format for fans:
{
  count: 2,
  limit: 2,
  remaining: 0,
  canRequest: false,
  resetDate: '2025-12-01T00:00:00.000Z',
  isArtist: false
}
```

#### 2. Fixed Route Order Issue
**Problem:** `/limit-check` route was being matched by `/:id` route (500 error)

**Solution:** Moved `/limit-check` route BEFORE `/:id` route in the router

Routes now in correct order:
```javascript
router.post('/', ...)                        // Create request
router.get('/my-requests', ...)              // Get user requests
router.get('/for-artist', ...)               // Get artist requests
router.put('/:id/respond', ...)              // Respond to request
router.get('/limit-check', ...)              // Check limit (MOVED UP)
router.get('/:id', ...)                      // Get single request
router.delete('/:id', ...)                   // Cancel request
```

### Frontend Changes

#### 1. Updated TypeScript Interface
**File:** `src/hooks/useCollabRequests.ts`

```typescript
export interface MonthlyLimit {
  count: number;
  limit: number | string;        // Can be 'unlimited' for artists
  remaining: number | string;    // Can be 'unlimited' for artists
  canRequest: boolean;
  resetDate: string | null;      // null for artists
  isArtist?: boolean;            // NEW: Indicates if user is an artist
}
```

#### 2. Updated Request Form
**File:** `src/components/RequestCollabForm.tsx`

- Shows "unlimited" for artists
- Shows "X requests remaining" for fans
- Only blocks fans when they reach limit (artists never blocked)

#### 3. Updated My Requests Page
**File:** `src/pages/MyCollabRequestsPage.tsx`

Two different views:

**For Artists:**
```
┌─────────────────────────────────┐
│ 🎨 Artist Status                │
│ As an artist, you have          │
│ unlimited collaboration requests│
│                                 │
│ ✅ You are associated with an   │
│    artist and can send unlimited│
│    collaboration requests       │
└─────────────────────────────────┘
```

**For Fans:**
```
┌─────────────────────────────────┐
│ 📅 Monthly Request Limit        │
│ You can make 2 requests/month   │
│                                 │
│ Used: 1/2    Remaining: 1       │
│ Resets on: Dec 1                │
│                                 │
│ ℹ️ You can make 1 more request  │
│    this month                   │
└─────────────────────────────────┘
```

---

## How to Identify Artists

The system checks the `lyricscape-artist-users-prod` DynamoDB table:

```javascript
// User is an artist if they have an entry like:
{
  artist_id: 123,
  user_id: "cognito-user-uuid"
}
```

**Important:** Only users with entries in this table are considered "artists" and get unlimited requests.

---

## Testing

### Test as a Fan (Regular User)
1. Login with a user NOT in `lyricscape-artist-users-prod`
2. Go to `/my-collab-requests`
3. Should see: "2 requests per month" limit card
4. Send 2 requests → 3rd should be blocked

### Test as an Artist
1. Login with a user that IS in `lyricscape-artist-users-prod`
2. Go to `/my-collab-requests`
3. Should see: "As an artist, you have unlimited..." message
4. Can send unlimited requests (no blocking)

---

## API Behavior

### GET `/api/collab-requests/limit-check`

**For Regular User:**
```json
{
  "count": 1,
  "limit": 2,
  "remaining": 1,
  "canRequest": true,
  "resetDate": "2025-12-01T00:00:00.000Z",
  "isArtist": false
}
```

**For Artist:**
```json
{
  "count": 0,
  "limit": "unlimited",
  "remaining": "unlimited",
  "canRequest": true,
  "resetDate": null,
  "isArtist": true
}
```

### POST `/api/collab-requests`

**Artist:** Always succeeds (no limit check blocks them)

**Fan:** Blocked with 429 error if limit reached:
```json
{
  "error": "Monthly limit reached",
  "message": "You can only make 2 collaboration requests per month",
  "limit": 2,
  "count": 2,
  "resetDate": "2025-12-01T00:00:00.000Z"
}
```

---

## Database Query

The backend checks artist association using:

```javascript
const ARTIST_USERS_TABLE = 'lyricscape-artist-users-prod';
const result = await dynamoClient.send(new ScanCommand({
  TableName: ARTIST_USERS_TABLE,
  FilterExpression: 'user_id = :uid',
  ExpressionAttributeValues: {
    ':uid': userId
  }
}));

const isArtist = result.Items && result.Items.length > 0;
```

---

## UI Improvements

### Navigation Icon Fix
**Fixed:** Missing `Handshake` and `Bell` icon imports in `Navigation.tsx`

```typescript
// Now properly imported:
import { ..., Handshake, Bell } from 'lucide-react';
```

---

## Summary of Files Changed

### Backend (1 file)
- ✅ `backend-api/routes/collab-requests.js`
  - Updated `checkMonthlyLimit()` to check artist status
  - Fixed route order (moved `/limit-check` before `/:id`)
  - Updated response format to include `isArtist` flag

### Frontend (4 files)
- ✅ `src/hooks/useCollabRequests.ts` - Updated `MonthlyLimit` interface
- ✅ `src/components/RequestCollabForm.tsx` - Shows unlimited for artists
- ✅ `src/pages/MyCollabRequestsPage.tsx` - Different UI for artists vs fans
- ✅ `src/components/Navigation.tsx` - Fixed missing icon imports

---

## Key Takeaways

1. **Artists = Unlimited**: Any user in `lyricscape-artist-users-prod` gets unlimited requests
2. **Fans = 2/month**: Regular users still limited to 2 requests per month
3. **Route Order Matters**: Specific routes must come before parameterized routes
4. **Graceful Degradation**: UI adapts based on user type (artist or fan)

---

## Next Steps

To make a user an artist and give them unlimited requests:

```javascript
// Add to lyricscape-artist-users-prod table:
{
  artist_id: <artist_id>,
  user_id: "<cognito_user_id>",
  created_at: Date.now()
}
```

That's it! The system will automatically detect they're an artist and remove limits. ✨
