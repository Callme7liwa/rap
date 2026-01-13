# Artist Content Ownership & Management System

## Overview

This system allows artists who are associated with their profiles to manage their own content (songs, albums, lyrics, artist information) without requiring full admin privileges. Admins retain full access to all content.

## Architecture

### Three Permission Levels

1. **Admin** - Full access to everything (existing admin system)
2. **Artist Owner** - Can manage only their own content
3. **Regular User** - No management access (read-only)

### How It Works

1. **Artist Association**: An admin associates a Cognito user with an artist profile using the existing admin panel
2. **Ownership Detection**: When an artist tries to modify content, middleware checks if:
   - User is an admin (→ allow)
   - User owns the artist profile that created the content (→ allow)
   - Otherwise (→ deny with 403)

## API Endpoints

### Artist Profile Management

#### `GET /api/artist-profile/me`
Get current user's artist profile information.
- **Auth**: Required (JWT token)
- **Returns**: Artist details + association info
- **Error**: 404 if user not associated with any artist

#### `PUT /api/artist-profile/me`
Update own artist profile.
- **Auth**: Required (JWT token)
- **Body**:
  ```json
  {
    "description_preview": "string",
    "description_html": "string",
    "description_markdown": "string",
    "instagram_name": "string",
    "twitter_name": "string",
    "facebook_name": "string"
  }
  ```
- **Returns**: Updated artist profile
- **Error**: 403 if user not associated with an artist

### Song Management

#### `GET /api/artist-content/my-content`
Get all content (songs + albums) for the current artist.
- **Auth**: Required (JWT token + artist association)
- **Returns**:
  ```json
  {
    "artist": {...},
    "songs": [...],
    "albums": [...],
    "totalSongs": 10,
    "totalAlbums": 3
  }
  ```

#### `POST /api/artist-content/songs`
Create a new song.
- **Auth**: Required (JWT token + artist association)
- **Body**:
  ```json
  {
    "title": "Song Title (required)",
    "song_art_image_url": "string",
    "lyrics": "string",
    "apple_music_url": "string",
    "spotify_url": "string",
    "youtube_url": "string",
    "genius_url": "string",
    "description": "string",
    "album_id": 123
  }
  ```
- **Returns**: Created song object
- **Note**: `artist_id` is automatically set from user's association

#### `PUT /api/artist-content/songs/:id`
Update an existing song.
- **Auth**: Required (JWT token + ownership)
- **Body**: Same fields as POST (all optional)
- **Returns**: Updated song object
- **Error**: 403 if user doesn't own this song

#### `DELETE /api/artist-content/songs/:id`
Delete a song.
- **Auth**: Required (JWT token + ownership)
- **Returns**: Success message
- **Error**: 403 if user doesn't own this song

### Album Management

#### `POST /api/artist-content/albums`
Create a new album.
- **Auth**: Required (JWT token + artist association)
- **Body**:
  ```json
  {
    "name": "Album Name (required)",
    "cover_art_url": "string",
    "release_year": 2024,
    "description": "string",
    "apple_music_url": "string",
    "spotify_url": "string"
  }
  ```
- **Returns**: Created album object

#### `PUT /api/artist-content/albums/:id`
Update an existing album.
- **Auth**: Required (JWT token + ownership)
- **Body**: Same fields as POST (all optional)
- **Returns**: Updated album object
- **Error**: 403 if user doesn't own this album

#### `DELETE /api/artist-content/albums/:id`
Delete an album.
- **Auth**: Required (JWT token + ownership)
- **Returns**: Success message
- **Error**: 403 if user doesn't own this album

## Middleware

### `artist-ownership.js`

Four middleware functions for access control:

#### `requireArtistOwnership`
Checks if user owns a specific artist profile.
- Used for: Updating artist information
- Allows: Admins + Artist owners
- Usage: `router.put('/artists/:id', verifyToken, requireArtistOwnership, ...)`

#### `requireSongOwnership`
Checks if user owns the artist who created a song.
- Used for: Song updates/deletions
- Allows: Admins + Artist who created the song
- Usage: `router.put('/songs/:id', verifyToken, requireSongOwnership, ...)`

#### `requireAlbumOwnership`
Checks if user owns the artist who created an album.
- Used for: Album updates/deletions
- Allows: Admins + Artist who created the album
- Usage: `router.put('/albums/:id', verifyToken, requireAlbumOwnership, ...)`

#### `checkArtistPermissions`
Lightweight check that adds permission info to request object.
- Used for: Endpoints that need to know user's status but don't require ownership
- Sets: `req.isAdmin`, `req.isArtist`, `req.userArtistId`
- Usage: `router.get('/my-content', verifyToken, checkArtistPermissions, ...)`

## Database Structure

### Artist-User Association Table
**Table**: `lyricscape-artist-users-prod`

```
{
  artist_id: number (PK),
  user_id: string (SK),
  associated_at: timestamp
}
```

**Indexes**:
- `UserIdIndex` - Query artists by user_id (GSI)

### Songs Table
**Table**: `lyricscape-songs-prod`

```
{
  id: number (PK),
  artist_id: number,
  title: string,
  lyrics: string,
  song_art_image_url: string,
  ...
}
```

### Albums Table
**Table**: `lyricscape-albums-prod`

```
{
  id: number (PK),
  artist_id: number,
  name: string,
  cover_art_url: string,
  release_year: number,
  ...
}
```

## Security Considerations

### ✅ What's Protected

1. **Ownership Verification**: Every update/delete checks ownership before allowing changes
2. **Admin Override**: Admins can always manage all content (for moderation)
3. **Token Verification**: All endpoints require valid JWT authentication
4. **Input Validation**: All fields are optional in updates (prevents accidental overwrites)
5. **Error Messages**: Clear error messages distinguish between "not found" and "access denied"

### ⚠️ Important Notes

1. **Only Associated Artists Can Create Content**: Regular users cannot create songs/albums
2. **Artist Association is Admin-Only**: Only admins can associate users with artists (prevents abuse)
3. **No Bulk Operations**: Each song/album must be modified individually (prevents mass changes)
4. **Audit Trail**: All operations include `last_updated` timestamp
5. **Soft Security**: Content is not deleted from likes/comments when removed (prevents data loss)

## Usage Examples

### Frontend Integration

```typescript
// Check if current user has artist permissions
const checkArtistPermissions = async () => {
  const response = await fetch('/api/artist-profile/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return {
      isArtist: true,
      artistId: data.artist.id,
      artistName: data.artist.name
    };
  }
  return { isArtist: false };
};

// Update song
const updateSong = async (songId, updates) => {
  const response = await fetch(`/api/artist-content/songs/${songId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updates)
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to update song');
  }
  
  return await response.json();
};

// Get all my content
const getMyContent = async () => {
  const response = await fetch('/api/artist-content/my-content', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  return await response.json();
};
```

### Testing with CLI

```bash
# Get artist profile
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/artist-profile/me

# Update artist description
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description_preview": "New description"}' \
  http://localhost:3000/api/artist-profile/me

# Create new song
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "My New Song", "lyrics": "..."}' \
  http://localhost:3000/api/artist-content/songs

# Update song
curl -X PUT \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Updated Title"}' \
  http://localhost:3000/api/artist-content/songs/123

# Get all my content
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/artist-content/my-content
```

## Error Handling

### Common Errors

| Status | Error | Meaning |
|--------|-------|---------|
| 401 | Unauthorized | No JWT token or invalid token |
| 403 | Access denied | User not associated with artist OR trying to modify someone else's content |
| 404 | Not found | Resource doesn't exist OR user has no artist association |
| 400 | Bad request | Missing required fields (e.g., title for new song) |
| 500 | Server error | Database or AWS error |

### Example Error Responses

```json
// Not associated with any artist
{
  "error": "Access denied",
  "message": "You must be associated with an artist profile to perform this action"
}

// Trying to modify someone else's content
{
  "error": "Access denied",
  "message": "You can only modify your own artist profile"
}

// Missing required field
{
  "error": "Song title is required"
}
```

## Implementation Checklist

### Backend ✅ (Completed)
- [x] Create `artist-ownership.js` middleware
- [x] Create `artist-content.js` routes
- [x] Add routes to `server.js`
- [x] Ownership verification for songs
- [x] Ownership verification for albums
- [x] Ownership verification for artists
- [x] CRUD endpoints for songs
- [x] CRUD endpoints for albums
- [x] GET endpoint for artist's own content

### Frontend 🚧 (To Do)
- [ ] Create artist dashboard page
- [ ] Add edit buttons to songs (visible only to owner)
- [ ] Add edit buttons to albums (visible only to owner)
- [ ] Add edit buttons to artist profile (visible only to owner)
- [ ] Create song/album edit forms
- [ ] Add permission checks in UI
- [ ] Show "Artist Mode" indicator in navigation
- [ ] Create "My Content" management page

### Testing 🚧 (To Do)
- [ ] Test admin can modify all content
- [ ] Test artist can modify only their content
- [ ] Test regular user cannot modify anything
- [ ] Test error messages are clear
- [ ] Test ownership transfers correctly
- [ ] Test bulk operations are prevented

## Future Enhancements

1. **Collaborative Artists**: Allow multiple users per artist (bands)
2. **Draft Mode**: Save changes without publishing
3. **Change History**: Track who changed what and when
4. **Approval Workflow**: Require admin approval for major changes
5. **Content Moderation**: Flag inappropriate content for review
6. **Analytics**: Show artists their content performance
7. **Batch Updates**: Allow updating multiple songs at once
8. **Version Control**: Revert to previous versions of lyrics/descriptions

## Migration Notes

### Existing Content
- All existing songs/albums remain unchanged
- Artists can immediately start managing their content once associated
- No data migration needed

### Backward Compatibility
- All existing APIs continue to work
- New endpoints are additive (don't break existing functionality)
- Admin panel retains all current capabilities

### Rollback Plan
- Simply remove the new routes from `server.js`
- Keep existing admin-only endpoints as fallback
- Artist-user associations remain in database for future use

## Support

For issues or questions:
1. Check error messages (they're designed to be helpful)
2. Verify user is properly associated in admin panel
3. Check JWT token is valid and not expired
4. Verify artist_id exists in database
5. Check CloudWatch logs for detailed error traces
