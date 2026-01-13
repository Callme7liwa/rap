# Social Features Implementation

## Overview
Complete social interaction system allowing users to follow artists, like content (songs/albums), and comment on songs and albums.

## Architecture

### DynamoDB Tables

#### 1. artist-follows-prod
- **Primary Key**: `PK` (FOLLOW#userId), `SK` (ARTIST#artistId)
- **GSI**: ArtistFollowersIndex - `GSI1PK` (ARTIST#artistId), `GSI1SK` (FOLLOW#timestamp)
- **Purpose**: Track which users follow which artists
- **Attributes**:
  - `user_id`: Cognito user ID
  - `artist_id`: Artist ID
  - `artist_name`: Artist name (for display)
  - `followed_at`: Timestamp

#### 2. content-likes-prod
- **Primary Key**: `PK` (LIKE#userId#type), `SK` (ITEM#itemId)
- **GSI**: ItemLikesIndex - `GSI1PK` (ITEM#type#itemId), `GSI1SK` (LIKE#timestamp)
- **Purpose**: Track likes on songs and albums
- **Attributes**:
  - `user_id`: Cognito user ID
  - `item_id`: Song or Album ID
  - `item_type`: 'song' or 'album'
  - `item_name`: Song/Album title
  - `liked_at`: Timestamp

#### 3. content-comments-prod
- **Primary Key**: `PK` (ITEM#type#itemId), `SK` (COMMENT#timestamp#commentId)
- **GSI**: UserCommentsIndex - `GSI1PK` (USER#userId), `GSI1SK` (COMMENT#timestamp)
- **Purpose**: Store comments on songs and albums
- **Attributes**:
  - `comment_id`: UUID
  - `user_id`: Cognito user ID
  - `user_name`: Username (from Cognito)
  - `item_id`: Song or Album ID
  - `item_type`: 'song' or 'album'
  - `text`: Comment text (max 500 chars)
  - `created_at`: Timestamp

## Backend API

### Base Route: `/api/social`

### Artist Following Endpoints

#### Follow/Unfollow Artist
- **POST** `/follow/artist/:id`
- **Auth**: Required
- **Response**: `{ success, action: 'followed' | 'unfollowed', following: boolean }`

#### Check Following Status
- **GET** `/follow/artist/:id/check`
- **Auth**: Required
- **Response**: `{ following: boolean }`

#### Get Follower Count
- **GET** `/follow/artist/:id/count`
- **Auth**: Not required
- **Response**: `{ count: number }`

#### Get My Followed Artists
- **GET** `/follow/my-artists`
- **Auth**: Required
- **Query**: `?limit=20&lastKey=...`
- **Response**: `{ artists: [...], lastKey }`

### Like Endpoints

#### Like/Unlike Content
- **POST** `/like/:type/:id` (type: song | album)
- **Auth**: Required
- **Response**: `{ success, action: 'liked' | 'unliked', liked: boolean }`

#### Check Like Status
- **GET** `/like/:type/:id/check`
- **Auth**: Required
- **Response**: `{ liked: boolean }`

#### Get Like Count
- **GET** `/like/:type/:id/count`
- **Auth**: Not required
- **Response**: `{ count: number }`

#### Get My Liked Content
- **GET** `/like/my-content`
- **Auth**: Required
- **Query**: `?type=song|album&limit=20&lastKey=...`
- **Response**: `{ content: [...], lastKey }`

### Comment Endpoints

#### Add Comment
- **POST** `/comment/:type/:id`
- **Auth**: Required
- **Body**: `{ text: string }` (max 500 chars)
- **Response**: `{ success, comment_id }`

#### Get Comments
- **GET** `/comment/:type/:id`
- **Auth**: Not required
- **Query**: `?limit=50&lastKey=...`
- **Response**: `{ comments: [...], lastKey }`

#### Delete Comment
- **DELETE** `/comment/:type/:id/:commentId`
- **Auth**: Required (must be comment owner)
- **Response**: `{ success }`

#### Get My Comments
- **GET** `/comment/my-comments`
- **Auth**: Required
- **Query**: `?limit=20&lastKey=...`
- **Response**: `{ comments: [...], lastKey }`

## Frontend Components

### FollowButton
**Location**: `src/components/FollowButton.tsx`

**Usage**:
```tsx
<FollowButton 
  artistId={123}
  artistName="Drake"
  variant="default"
  size="sm"
  showText={true}
/>
```

**Props**:
- `artistId` (required): Artist ID
- `artistName`: Display name for toasts
- `variant`: 'default' | 'outline' | 'ghost'
- `size`: 'default' | 'sm' | 'lg' | 'icon'
- `showText`: Show "Follow"/"Following" text
- `className`: Additional CSS classes

**Features**:
- React Query integration
- Optimistic updates
- Authentication check
- Toast notifications
- UserPlus/UserMinus icons

### LikeButton
**Location**: `src/components/LikeButton.tsx`

**Usage**:
```tsx
<LikeButton 
  contentType="song"
  contentId={456}
  showCount={true}
  variant="ghost"
/>
```

**Props**:
- `contentType` (required): 'song' | 'album'
- `contentId` (required): Content ID
- `onLikeChange`: Callback when like changes
- `variant`: 'default' | 'ghost' | 'outline'
- `size`: 'default' | 'sm' | 'lg' | 'icon'
- `showCount`: Display like count
- `className`: Additional CSS classes

**Features**:
- React Query integration
- Optimistic updates
- Heart icon (filled when liked)
- Live like count
- Toast notifications

### CommentSection
**Location**: `src/components/CommentSection.tsx`

**Usage**:
```tsx
<CommentSection 
  type="song"
  itemId={789}
  itemName="God's Plan"
/>
```

**Props**:
- `type` (required): 'song' | 'album'
- `itemId` (required): Content ID
- `itemName`: Display name for placeholder

**Features**:
- Comment list with pagination
- Add new comments (max 500 chars)
- Delete own comments
- Character counter
- Time ago display (e.g., "2 hours ago")
- Scrollable comment area
- Empty state

## Frontend API Functions

**Location**: `src/lib/api.ts`

### Artist Following
- `followArtist(artistId, artistName)` - Toggle follow
- `checkFollowingArtist(artistId)` - Check status
- `getArtistFollowerCount(artistId)` - Get count
- `getMyFollowedArtists(limit?, lastKey?)` - Get user's follows

### Content Likes
- `likeContent(type, id)` - Toggle like
- `checkLikedContent(type, id)` - Check status
- `getContentLikeCount(type, id)` - Get count
- `getMyLikedContent(type?, limit?, lastKey?)` - Get user's likes

### Comments
- `addComment(type, id, text)` - Add comment
- `getComments(type, id, limit?, lastKey?)` - Get comments
- `deleteComment(type, id, commentId)` - Delete comment
- `getMyComments(limit?, lastKey?)` - Get user's comments

## Integration Guide

### Artist Detail Page
```tsx
import { FollowButton } from '@/components/FollowButton';

// In your ArtistDetail component
<div className="flex items-center gap-4">
  <h1>{artist.name}</h1>
  <FollowButton 
    artistId={artist.id}
    artistName={artist.name}
    showText={true}
  />
</div>

// Show follower count
<div className="text-muted-foreground">
  {followerCount} followers
</div>
```

### Song/Album Detail Page
```tsx
import { LikeButton } from '@/components/LikeButton';
import { CommentSection } from '@/components/CommentSection';

// Like button
<LikeButton 
  contentType="song"
  contentId={song.id}
  showCount={true}
/>

// Comment section
<CommentSection 
  type="song"
  itemId={song.id}
  itemName={song.title}
/>
```

### Song Row/Card
```tsx
import { LikeButton } from '@/components/LikeButton';

// Add like button to song rows
<LikeButton 
  contentType="song"
  contentId={song.id}
  variant="ghost"
  size="sm"
  showCount={true}
/>
```

## Database Setup

Run the table creation script:
```bash
cd backend-api
node scripts/create-social-tables.js
```

This creates all three DynamoDB tables with proper indexes and configurations.

## Security

- All write operations (follow, like, comment) require authentication
- Users can only delete their own comments
- Token verification via middleware (`verifyToken`)
- Input validation (comment length, content type)

## Performance Considerations

- GSI for efficient reverse lookups (followers, likes)
- Pagination support for all list endpoints
- Optimistic updates for better UX
- React Query caching and invalidation

## Testing Checklist

- [ ] Follow/unfollow artist
- [ ] Follower count updates
- [ ] Like/unlike song
- [ ] Like/unlike album
- [ ] Like count displays correctly
- [ ] Add comment on song
- [ ] Add comment on album
- [ ] Comment appears in list
- [ ] Delete own comment
- [ ] Can't delete others' comments
- [ ] Sign-in prompt for unauthenticated users
- [ ] Comment character limit enforcement
- [ ] Pagination works for comments
- [ ] Time display shows "X ago" format

## Next Steps

1. **Integrate into existing pages**:
   - Add FollowButton to ArtistDetail page
   - Add LikeButton to SongRow component
   - Add LikeButton to AlbumCard component
   - Add CommentSection to SongDetail page
   - Add CommentSection to AlbumDetail page

2. **Add notifications** (future):
   - Notify artists when followed
   - Notify on new comments
   - Like milestones

3. **Analytics** (future):
   - Most followed artists
   - Most liked songs/albums
   - Trending content based on recent activity

4. **User Profile Integration**:
   - Show followed artists on profile
   - Show liked content on profile
   - Show user's comments on profile

## Files Created/Modified

### New Files
- `backend-api/scripts/create-social-tables.js`
- `backend-api/routes/social.js`
- `src/components/FollowButton.tsx`
- `src/components/CommentSection.tsx`

### Modified Files
- `backend-api/server.js` - Added social router
- `src/lib/api.ts` - Added 12 social API functions
- `src/components/LikeButton.tsx` - Updated to use new API

## Status

✅ **Completed**:
- DynamoDB tables created
- Backend API (12 endpoints)
- Frontend API functions
- FollowButton component
- LikeButton component (updated)
- CommentSection component
- Authentication integration
- Error handling

⏳ **Pending**:
- Integration into existing pages
- End-to-end testing
- User profile page updates
