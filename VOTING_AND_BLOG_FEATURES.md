# New Features: Voting & Blog System

## 🗳️ Voting System

A complete voting platform where users can vote for their favorite rappers, songs, and albums on a monthly/yearly basis.

### Features
- **Multiple Poll Categories**: Rapper of the Month/Year, Song of the Month/Year, Album of the Month/Year
- **Real-time Results**: Live vote counts and percentages with visual progress bars
- **Ranking System**: Top 3 nominees highlighted with gold/silver/bronze badges
- **Vote Tracking**: Prevents duplicate votes per poll per user
- **Stats Dashboard**: Shows total polls, votes, user participation
- **Responsive Design**: Beautiful cards with nominee images and metadata

### Files Created
- `src/types/voting.ts` - TypeScript types for polls, nominees, votes
- `src/lib/voting-api.ts` - Mock API functions (ready to connect to backend)
- `src/pages/Voting.tsx` - Main voting page with active polls

### Usage
```bash
# Navigate to voting page
http://localhost:8089/voting
```

### API Integration Points
Replace mock functions in `src/lib/voting-api.ts`:
- `getActivePolls()` - Fetch active polls from backend
- `submitVote(pollId, nomineeId)` - POST vote to backend
- `getUserVotes(userId)` - Get user's voting history
- `getVotingStats()` - Get overall voting statistics

---

## 📝 Blog System

A full-featured blog platform where artists can write, publish, and share articles with the community.

### Features
- **Rich Content**: Markdown-style formatting with headings, lists, images
- **Post Management**: Create, edit, publish blog posts
- **Social Features**: Like, bookmark, share, comment on posts
- **Author Profiles**: Links to artist profiles
- **Tags & Categories**: Organize posts by topics
- **Engagement Metrics**: View counts, likes, comments tracking
- **Responsive Grid**: Beautiful card layout for blog listings
- **SEO-friendly**: Slug-based URLs for better discoverability

### Files Created
- `src/types/blog.ts` - TypeScript types for posts, comments, stats
- `src/lib/blog-api.ts` - Mock API functions (ready to connect to backend)
- `src/pages/Blog.tsx` - Blog listing page
- `src/pages/BlogDetail.tsx` - Individual blog post viewer

### Usage
```bash
# Blog listing
http://localhost:8089/blog

# Individual post
http://localhost:8089/blog/my-journey-in-hip-hop
```

### API Integration Points
Replace mock functions in `src/lib/blog-api.ts`:
- `getBlogPosts(limit?)` - Fetch published posts
- `getBlogPostBySlug(slug)` - Get single post by URL slug
- `getBlogPostsByAuthor(authorId)` - Get posts by specific artist
- `createBlogPost(post)` - POST new blog post
- `getBlogStats()` - Get blog statistics

---

## 🎨 UI Components Used
Both features leverage the existing shadcn/ui components:
- Card, CardHeader, CardContent
- Button, Badge, Progress
- Skeleton (loading states)
- toast/Sonner (notifications)
- Motion (Framer Motion animations)

---

## 🚀 Next Steps

### For Voting System:
1. Create backend API endpoints for polls and votes
2. Add database schema for polls, nominees, votes
3. Implement authentication to track user votes
4. Add admin interface to create/manage polls
5. Set up automated poll creation (monthly/yearly)

### For Blog System:
1. Create backend API endpoints for posts and comments
2. Add database schema for blog_posts, blog_comments
3. Implement rich text editor (TipTap, Quill, or similar)
4. Add image upload functionality for cover images
5. Implement comment system with threading
6. Add draft/publish workflow
7. Create author dashboard to manage posts

---

## 📊 Database Schema Suggestions

### Voting Tables
```sql
CREATE TABLE polls (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category VARCHAR(20), -- 'rapper', 'song', 'album'
  period VARCHAR(20), -- 'month', 'year', 'alltime'
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE nominees (
  id UUID PRIMARY KEY,
  poll_id UUID REFERENCES polls(id),
  item_id INTEGER, -- artist_id, song_id, or album_id
  name TEXT NOT NULL,
  image_url TEXT,
  votes INTEGER DEFAULT 0
);

CREATE TABLE votes (
  id UUID PRIMARY KEY,
  poll_id UUID REFERENCES polls(id),
  nominee_id UUID REFERENCES nominees(id),
  user_id TEXT NOT NULL,
  voted_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- prevent duplicate votes
);
```

### Blog Tables
```sql
CREATE TABLE blog_posts (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  author_id INTEGER REFERENCES artists(id),
  tags TEXT[], -- Array of tags
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP,
  updated_at TIMESTAMP,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0
);

CREATE TABLE blog_comments (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES blog_posts(id),
  user_id TEXT NOT NULL,
  user_name TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  likes INTEGER DEFAULT 0
);
```

---

## 🎯 Testing
```bash
# Start the dev server
cd /mnt/c/git/lyrics/lyricscape-creations
npm run dev

# Visit the new pages
# http://localhost:8089/voting
# http://localhost:8089/blog
```

The features are fully functional with mock data and ready to be connected to your backend API!
