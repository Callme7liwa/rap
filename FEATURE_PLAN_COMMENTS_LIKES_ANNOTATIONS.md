# Feature Implementation Plan: Comments, Likes & Lyrics Annotations

## Overview
This document outlines the implementation plan for adding comprehensive social features to songs and albums, plus a lyrics annotation system.

---

## Part 1: Comments & Likes for Songs and Albums

### 1.1 Backend - DynamoDB Tables

#### Table: `lyricscape-song-comments-prod`
```javascript
{
  comment_id: "uuid",           // Primary key
  song_id: "string",            // GSI partition key
  user_id: "string",            // From Cognito
  user_name: "string",          // From user profile
  user_picture: "string",       // From user profile
  content: "string",            // Comment text
  created_at: number,           // Sort key (timestamp)
  updated_at: number,
  likes: number
}
```

#### Table: `lyricscape-album-comments-prod`
```javascript
{
  comment_id: "uuid",           // Primary key
  album_id: "string",           // GSI partition key
  user_id: "string",            // From Cognito
  user_name: "string",          // From user profile
  user_picture: "string",       // From user profile
  content: "string",            // Comment text
  created_at: number,           // Sort key (timestamp)
  updated_at: number,
  likes: number
}
```

#### Update Existing Tables: Songs & Albums
Add new fields to track likes:
```javascript
{
  // ... existing fields
  likes: number,                // Total like count
  liked_by: {                   // Map of user IDs
    "user-id-1": true,
    "user-id-2": true
  }
}
```

### 1.2 Backend Routes

#### Song Comments
- `GET /api/songs/:id/comments` - Get all comments for a song
- `POST /api/songs/:id/comment` - Add comment (authenticated)
- `DELETE /api/songs/:id/comment/:commentId` - Delete own comment (authenticated)

#### Album Comments
- `GET /api/albums/:id/comments` - Get all comments for an album
- `POST /api/albums/:id/comment` - Add comment (authenticated)
- `DELETE /api/albums/:id/comment/:commentId` - Delete own comment (authenticated)

#### Song Likes
- `POST /api/songs/:id/like` - Like/unlike a song (authenticated)
- `GET /api/songs/:id/likes` - Get list of users who liked

#### Album Likes
- `POST /api/albums/:id/like` - Like/unlike an album (authenticated)
- `GET /api/albums/:id/likes` - Get list of users who liked

### 1.3 Frontend Components

#### Comments Section Component
```tsx
<CommentsSection
  contentType="song" | "album"
  contentId={id}
  comments={comments}
  onAddComment={handleAddComment}
/>
```

#### Like Display Modal
```tsx
<LikesModal
  contentType="song" | "album" | "blog"
  contentId={id}
  likedByUsers={users}
/>
```

#### Enhanced LikeButton
```tsx
<LikeButton
  contentType="song" | "album" | "blog"
  contentId={id}
  onDoubleClick={handleUnlike}  // NEW: Double-click to unlike
  showLikesList={true}           // NEW: Click to show who liked
/>
```

---

## Part 2: Lyrics Annotation System

### 2.1 Concept
Users can:
1. **Select text** in lyrics
2. **Add explanation/annotation**
3. **View all explanations** for that text selection
4. **Vote** on explanations (best explanation rises to top)
5. **Visual indicators** show which lyrics have annotations

### 2.2 Backend - DynamoDB Table

#### Table: `lyricscape-lyrics-annotations-prod`
```javascript
{
  annotation_id: "uuid",        // Primary key
  song_id: "string",            // GSI partition key
  created_at: number,           // Sort key
  
  // Text selection info
  selected_text: "string",      // The actual lyrics selected
  start_index: number,          // Character position in lyrics
  end_index: number,            // Character position in lyrics
  line_number: number,          // Optional: line number in lyrics
  
  // User info
  user_id: "string",
  user_name: "string",
  user_picture: "string",
  
  // Annotation content
  explanation: "string",        // User's explanation
  
  // Engagement
  upvotes: number,
  downvotes: number,
  voted_by: {                   // Track who voted
    "user-id": "up" | "down"
  },
  
  updated_at: number
}
```

### 2.3 Backend Routes

#### Annotations
- `GET /api/songs/:id/annotations` - Get all annotations for a song
- `POST /api/songs/:id/annotate` - Create new annotation (authenticated)
- `PUT /api/annotations/:id` - Update own annotation (authenticated)
- `DELETE /api/annotations/:id` - Delete own annotation (authenticated)
- `POST /api/annotations/:id/vote` - Upvote/downvote annotation (authenticated)

### 2.4 Frontend Features

#### Lyrics Display Component
```tsx
<LyricsDisplay
  lyrics={song.lyrics}
  annotations={annotations}
  onTextSelect={handleTextSelection}
  onAnnotationClick={showAnnotations}
/>
```

**Features:**
1. **Text Selection**: User selects part of lyrics
2. **Highlight Annotated Text**: Yellow underline/background for annotated sections
3. **Annotation Count Badge**: Shows number of explanations (e.g., "3 explanations")
4. **Click to View**: Click highlighted text to see all explanations

#### Annotation Creation Modal
```tsx
<AnnotationModal
  selectedText={selectedLyrics}
  startIndex={startIdx}
  endIndex={endIdx}
  onSave={handleSaveAnnotation}
/>
```

#### Annotations List Panel
```tsx
<AnnotationsList
  selectedText={selectedLyrics}
  annotations={annotations}
  onVote={handleVote}
  onAddNew={handleAddAnnotation}
/>
```

**Features:**
- Sort by votes (best first)
- Show user profile picture and name
- Upvote/downvote buttons
- Timestamp ("2 hours ago")
- "Add your explanation" button

### 2.5 Visual Design

#### Annotated Lyrics Example
```
Normal lyrics here...

[This is an annotated line with deep meaning] ← Yellow highlight + underline
  └─ 🔍 3 explanations available

More normal lyrics...
```

#### Annotation Panel (Side or Bottom)
```
┌─────────────────────────────────────┐
│ "annotated line with deep meaning"  │
│ 3 Explanations                      │
├─────────────────────────────────────┤
│ 👤 User1 • 2 days ago     ⬆ 45 ⬇ 2 │
│ This line refers to...              │
├─────────────────────────────────────┤
│ 👤 User2 • 1 week ago     ⬆ 32 ⬇ 5 │
│ I think it means...                 │
├─────────────────────────────────────┤
│ 👤 User3 • 3 days ago     ⬆ 18 ⬇ 1 │
│ From my perspective...              │
├─────────────────────────────────────┤
│ + Add Your Explanation              │
└─────────────────────────────────────┘
```

---

## Part 3: Implementation Order

### Phase 1: Songs & Albums Comments/Likes (1-2 days)
1. Create DynamoDB tables for comments
2. Create backend routes for comments and likes
3. Update Songs/Albums tables with likes fields
4. Build CommentsSection component
5. Enhance LikeButton with double-click and likes list

### Phase 2: Likes Display (1 day)
1. Create LikesModal component
2. Add "View Likes" functionality
3. Fetch user profiles for display

### Phase 3: Lyrics Annotations Backend (1-2 days)
1. Design DynamoDB table schema
2. Create backend routes
3. Implement voting system
4. Test with sample data

### Phase 4: Lyrics Annotations Frontend (2-3 days)
1. Build text selection handler
2. Create annotation highlights
3. Build AnnotationModal component
4. Build AnnotationsList component
5. Integrate voting UI
6. Add visual indicators

### Phase 5: Testing & Polish (1 day)
1. Test all features end-to-end
2. Add loading states
3. Add error handling
4. Optimize performance
5. Mobile responsiveness

---

## Part 4: Technical Considerations

### Text Selection Challenges
- **Overlap**: Multiple annotations on same text
- **Solution**: Layer highlights, show count badge

### Performance
- **Lazy Loading**: Load annotations on demand
- **Caching**: Cache frequently viewed annotations
- **Pagination**: Paginate comments and annotations

### Security
- **Authentication**: All write operations require auth
- **Authorization**: Users can only edit/delete own content
- **Validation**: Validate text selection ranges
- **Rate Limiting**: Prevent spam

### Mobile UX
- **Text Selection**: Mobile-friendly selection
- **Modals**: Bottom sheets on mobile
- **Touch Gestures**: Tap to view, long-press to annotate

---

## Part 5: Database Schema Scripts

All table creation scripts will be placed in:
```
backend-api/scripts/
  create-song-comments-table.js
  create-album-comments-table.js
  create-lyrics-annotations-table.js
  update-songs-likes-field.js
  update-albums-likes-field.js
```

---

## Success Metrics

### Engagement
- Number of comments per song/album
- Number of likes per song/album
- Number of annotations per song
- Average explanations per annotation

### Quality
- Annotation vote ratio (upvotes/downvotes)
- Comment retention rate
- User participation rate

---

## Future Enhancements (Optional)

1. **Threaded Comments**: Reply to comments
2. **Comment Reactions**: Like/dislike comments
3. **Annotation Replies**: Reply to explanations
4. **Rich Text**: Markdown in annotations
5. **Media Attachments**: Images in explanations
6. **Notifications**: Notify when someone replies
7. **Moderation**: Report inappropriate content
8. **Analytics**: Track popular annotations

---

## Ready to Start?

This is a comprehensive plan. Let's start with **Phase 1: Songs & Albums Comments/Likes**.

Would you like me to begin implementation?
