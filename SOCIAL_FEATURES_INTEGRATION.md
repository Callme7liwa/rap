# Social Features Integration Examples

## How to Add Social Features to Your Pages

### 1. Artist Detail Page (ArtistDetail.tsx)

Add the FollowButton next to the artist name and show follower count:

```tsx
// Add import at the top
import { FollowButton } from '@/components/FollowButton';
import { getArtistFollowerCount } from '@/lib/api';

// Inside your component, add this query
const { data: followerData } = useQuery({
  queryKey: ['artist-followers', artistId],
  queryFn: () => getArtistFollowerCount(artistId),
  enabled: !!artistId,
});

// In your JSX, find the artist header section (around line 150-200) and update:
<div className="flex items-center justify-between mb-4">
  <div className="flex items-center gap-4">
    <h1 className="text-4xl font-bold">{artist.name}</h1>
    <FollowButton 
      artistId={artistId}
      artistName={artist.name}
      showText={true}
      variant="default"
    />
  </div>
</div>

{/* Show follower count */}
<div className="flex items-center gap-4 text-muted-foreground mb-6">
  <div className="flex items-center gap-2">
    <Users className="w-4 h-4" />
    <span>{followerData?.count || 0} followers</span>
  </div>
  {/* Other stats... */}
</div>
```

**Current LikeButton**: Your ArtistDetail already imports LikeButton but it might be using the old API. Make sure it uses the new version:

```tsx
{/* Remove old LikeButton for artist if present */}
{/* Artists don't have likes in the new social system, only songs/albums */}
```

### 2. Song Detail Page (SongDetail.tsx)

Update the existing imports and add CommentSection:

```tsx
// Update imports at the top
import { LikeButton } from '@/components/LikeButton';
import { CommentSection } from '@/components/CommentSection';

// In your JSX, find the song actions section and ensure LikeButton is present:
<div className="flex items-center gap-4">
  <LikeButton 
    contentType="song"
    contentId={songId}
    showCount={true}
    variant="ghost"
  />
  
  <Button onClick={copyLyrics} variant="outline">
    <Copy className="w-4 h-4 mr-2" />
    Copy Lyrics
  </Button>
  
  <Button onClick={shareSong} variant="outline">
    <Share2 className="w-4 h-4 mr-2" />
    Share
  </Button>
</div>

{/* Add CommentSection after lyrics section (around line 300-350) */}
{/* Replace or update your existing CommentsSection */}
<div className="mt-8">
  <CommentSection 
    type="song"
    itemId={songId}
    itemName={song.title}
  />
</div>
```

**Note**: You already have a `CommentsSection` import. The new `CommentSection` component (singular) uses the new social API. You should replace the old one.

### 3. Album Detail Page (if you have one)

Similar to Song Detail:

```tsx
import { LikeButton } from '@/components/LikeButton';
import { CommentSection } from '@/components/CommentSection';

// In album header/actions
<div className="flex items-center gap-4">
  <LikeButton 
    contentType="album"
    contentId={albumId}
    showCount={true}
    variant="ghost"
  />
</div>

// After album content
<CommentSection 
  type="album"
  itemId={albumId}
  itemName={album.title}
/>
```

### 4. Song Row Component (SongRow.tsx)

Add like button to each song row:

```tsx
import { LikeButton } from '@/components/LikeButton';

// In your song row JSX, add the like button
<div className="flex items-center gap-2">
  <LikeButton 
    contentType="song"
    contentId={song.id}
    showCount={false}  // Hide count in compact view
    variant="ghost"
    size="sm"
  />
  {/* Other song actions... */}
</div>
```

### 5. Album Card Component (AlbumCard.tsx)

Add like button to album cards:

```tsx
import { LikeButton } from '@/components/LikeButton';

// In your album card JSX
<div className="flex items-center justify-between">
  <span className="text-sm text-muted-foreground">{album.year}</span>
  <LikeButton 
    contentType="album"
    contentId={album.id}
    showCount={true}
    variant="ghost"
    size="sm"
  />
</div>
```

## Quick Integration Checklist

### Immediate Changes (High Priority)

1. **ArtistDetail.tsx**:
   - ✅ Add FollowButton import
   - ✅ Add FollowButton component to artist header
   - ✅ Add follower count display
   - ✅ Remove old artist LikeButton (if present)

2. **SongDetail.tsx**:
   - ✅ Update LikeButton to use new props (contentType="song", contentId)
   - ✅ Replace old CommentsSection with new CommentSection
   - ✅ Ensure proper TypeScript types

### Later Improvements (Lower Priority)

3. **SongRow.tsx**:
   - Add LikeButton to each song row
   - Small size, no count display

4. **AlbumCard.tsx**:
   - Add LikeButton to each album card
   - Show like count

5. **User Profile Page**:
   - Show followed artists list
   - Show liked songs/albums
   - Show user's comments

## Important Notes

### Old vs New Components

**Old LikeButton** (if you see this pattern):
- Used `contentId: string` (string type)
- Used `initialLiked`, `initialLikes` props
- Used direct `fetch` with manual authentication
- Supported 'artist' and 'blog' types

**New LikeButton**:
- Uses `contentId: number` (number type)
- No initial props (uses React Query)
- Uses API functions from `@/lib/api`
- Only supports 'song' and 'album' types
- Better performance with caching

**Old CommentsSection** (plural):
- May have different API
- Check your current implementation

**New CommentSection** (singular):
- Uses `/api/social/comment` endpoints
- React Query integration
- Supports only songs and albums
- Max 500 characters per comment

### Migration Steps

If your existing components use different props:

1. **Update imports**:
```tsx
// Before
import { LikeButton } from '@/components/LikeButton';

// After (same import, but component is updated)
import { LikeButton } from '@/components/LikeButton';
```

2. **Update props**:
```tsx
// Before
<LikeButton 
  contentType="song"
  contentId="123"  // string
  initialLiked={false}
  initialLikes={0}
/>

// After
<LikeButton 
  contentType="song"
  contentId={123}  // number
  showCount={true}
/>
```

3. **Remove old comment components**:
```tsx
// Find and replace
<CommentsSection ...props />

// With
<CommentSection type="song" itemId={songId} itemName={song.title} />
```

## Testing Your Integration

After integrating, test these scenarios:

### Follow Feature
1. Go to an artist page
2. Click Follow button (should show "Following")
3. Refresh page (should stay "Following")
4. Click again to unfollow
5. Check follower count updates

### Like Feature
1. Go to a song or album
2. Click heart icon (should fill red)
3. Check like count increases
4. Click again to unlike
5. Navigate away and back (state should persist)

### Comment Feature
1. Go to a song detail page
2. Scroll to comments section
3. Type a comment (test 500 char limit)
4. Submit comment
5. See your comment appear
6. Delete your own comment
7. Try to delete others' comments (should not show delete button)

## Common Issues

### Issue: "contentId must be a number"
**Solution**: Make sure you're parsing the ID:
```tsx
const songId = parseInt(id || '0');
<LikeButton contentId={songId} contentType="song" />
```

### Issue: "Type 'artist' is not assignable"
**Solution**: The new LikeButton only supports 'song' and 'album'. Remove artist likes.

### Issue: Comments not showing
**Solution**: Check that:
- DynamoDB tables are created
- Backend server is running
- API route is mounted at `/api/social`
- User is authenticated for write operations

### Issue: "Cannot read property 'sub' of undefined"
**Solution**: The CommentSection gets user ID from fetchAuthSession, not from user.sub directly. This is already fixed in the new version.

## Example Full Integration

Here's a complete example for SongDetail.tsx:

```tsx
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSongById } from '@/lib/api';
import { LikeButton } from '@/components/LikeButton';
import { CommentSection } from '@/components/CommentSection';
import { Button } from '@/components/ui/button';
import { Copy, Share2 } from 'lucide-react';

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id || '0');

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => getSongById(songId),
    enabled: !!songId,
  });

  if (isLoading) return <div>Loading...</div>;
  if (!song) return <div>Song not found</div>;

  return (
    <div className="container mx-auto p-6">
      {/* Song Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">{song.title}</h1>
        <p className="text-xl text-muted-foreground">{song.artist_name}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 mb-8">
        <LikeButton 
          contentType="song"
          contentId={songId}
          showCount={true}
          variant="ghost"
        />
        <Button onClick={() => {/* copy logic */}} variant="outline">
          <Copy className="w-4 h-4 mr-2" />
          Copy Lyrics
        </Button>
        <Button onClick={() => {/* share logic */}} variant="outline">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Lyrics */}
      <div className="mb-8 p-6 bg-card rounded-lg">
        <pre className="whitespace-pre-wrap font-lyrics">
          {song.lyrics}
        </pre>
      </div>

      {/* Comments */}
      <CommentSection 
        type="song"
        itemId={songId}
        itemName={song.title}
      />
    </div>
  );
}
```

## Next Steps

1. Start with **ArtistDetail.tsx** - add FollowButton (easiest)
2. Update **SongDetail.tsx** - update LikeButton and add CommentSection
3. Test thoroughly with authenticated and unauthenticated users
4. Add to **SongRow** and **AlbumCard** components
5. Create a user profile page to show social activity

## Need Help?

- Check `SOCIAL_FEATURES.md` for complete API documentation
- All components are in `src/components/` directory
- Backend routes in `backend-api/routes/social.js`
- API functions in `src/lib/api.ts`
