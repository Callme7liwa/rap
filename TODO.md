# 📝 TODO List - Lyricscape Creations

This file tracks all pending tasks and future enhancements for the project.

## 🔥 Critical Priority (Do First)

### Infrastructure Deployment
- [ ] Run `terraform plan` to review infrastructure changes
- [ ] Run `terraform apply` to create:
  - [ ] 8 DynamoDB tables
  - [ ] S3 user_uploads bucket
  - [ ] All configurations (lifecycle, CORS, encryption, etc.)
- [ ] Note Terraform outputs for environment variables
- [ ] Verify resources in AWS Console

### Backend Setup
- [ ] Install dependencies: `npm install multer @aws-sdk/lib-dynamodb @aws-sdk/s3-request-presigner aws-jwt-verify`
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in AWS credentials in `.env`
- [ ] Add DynamoDB table names from Terraform output to `.env`
- [ ] Add S3 bucket names from Terraform output to `.env`
- [ ] Start backend: `node server.js`
- [ ] Verify backend health: `curl http://localhost:3000/api/health`

### Frontend Setup
- [ ] Start frontend: `npm run dev`
- [ ] Verify frontend loads at `http://localhost:8089`
- [ ] Test navigation to all pages

### Testing
- [ ] Sign in with email/password
- [ ] Navigate to `/my-uploads`
- [ ] Upload a test file
- [ ] Verify file appears in grid
- [ ] Download the file
- [ ] Delete the file
- [ ] Verify in AWS S3 Console (file should be there)
- [ ] Verify in AWS DynamoDB Console (metadata should be there)

---

## ⚡ High Priority

### Backend API Routes

#### Artists API
- [ ] Create `backend-api/routes/artists.js`
- [ ] POST /api/artists - Create artist
  - [ ] Validate required fields (name, genre, country)
  - [ ] Store artist data in DynamoDB artists table
  - [ ] Upload artist image to S3 if provided
  - [ ] Return created artist
- [ ] GET /api/artists - List all artists
  - [ ] Query DynamoDB artists table
  - [ ] Support pagination
  - [ ] Support search by name
  - [ ] Generate signed URLs for images
- [ ] GET /api/artists/:id - Get artist by ID
  - [ ] Query DynamoDB by artist_id
  - [ ] Generate signed URL for image
  - [ ] Include related albums/songs count
- [ ] PUT /api/artists/:id - Update artist
  - [ ] Verify ownership (created_by = user_id) or admin
  - [ ] Update DynamoDB record
  - [ ] Handle image updates
- [ ] DELETE /api/artists/:id - Delete artist
  - [ ] Verify ownership or admin
  - [ ] Delete from DynamoDB
  - [ ] Delete image from S3
  - [ ] Handle cascading deletes (albums/songs)
- [ ] Mount router in server.js: `app.use('/api/artists', artistsRouter)`

#### Albums API
- [ ] Create `backend-api/routes/albums.js`
- [ ] POST /api/albums - Create album
  - [ ] Validate required fields (title, artist_id, releaseDate, genre)
  - [ ] Verify artist exists
  - [ ] Store album data in DynamoDB albums table
  - [ ] Upload cover art to S3 if provided
  - [ ] Return created album
- [ ] GET /api/albums - List all albums
  - [ ] Query DynamoDB albums table
  - [ ] Support pagination
  - [ ] Support filter by artist_id
  - [ ] Support filter by genre
  - [ ] Generate signed URLs for cover art
- [ ] GET /api/albums/:id - Get album by ID
  - [ ] Query DynamoDB by album_id
  - [ ] Include artist details
  - [ ] Include songs list
  - [ ] Generate signed URLs
- [ ] PUT /api/albums/:id - Update album
  - [ ] Verify ownership or admin
  - [ ] Update DynamoDB record
  - [ ] Handle cover art updates
- [ ] DELETE /api/albums/:id - Delete album
  - [ ] Verify ownership or admin
  - [ ] Delete from DynamoDB
  - [ ] Delete cover art from S3
  - [ ] Handle cascading deletes (songs)
- [ ] Mount router in server.js: `app.use('/api/albums', albumsRouter)`

#### Songs API
- [ ] Create `backend-api/routes/songs.js`
- [ ] POST /api/songs - Create song
  - [ ] Validate required fields (title, artist_id, duration, genre, releaseDate)
  - [ ] Verify artist exists
  - [ ] Verify album exists (if provided)
  - [ ] Store song data in DynamoDB songs table
  - [ ] Upload audio file to S3 if provided
  - [ ] Upload cover art to S3 if provided
  - [ ] Store lyrics in DynamoDB
  - [ ] Return created song
- [ ] GET /api/songs - List all songs
  - [ ] Query DynamoDB songs table
  - [ ] Support pagination
  - [ ] Support filter by artist_id
  - [ ] Support filter by album_id
  - [ ] Support filter by genre
  - [ ] Generate signed URLs for audio/cover art
- [ ] GET /api/songs/:id - Get song by ID
  - [ ] Query DynamoDB by song_id
  - [ ] Include artist details
  - [ ] Include album details
  - [ ] Include lyrics
  - [ ] Generate signed URLs
- [ ] PUT /api/songs/:id - Update song
  - [ ] Verify ownership or admin
  - [ ] Update DynamoDB record
  - [ ] Handle file updates
- [ ] DELETE /api/songs/:id - Delete song
  - [ ] Verify ownership or admin
  - [ ] Delete from DynamoDB
  - [ ] Delete files from S3
- [ ] Mount router in server.js: `app.use('/api/songs', songsRouter)`

### Frontend Updates

#### Connect Admin Pages
- [ ] Update `src/pages/AddArtist.tsx`
  - [ ] Replace mock API call with `POST /api/artists`
  - [ ] Add JWT token to headers
  - [ ] Handle success/error responses
  - [ ] Redirect to artist detail page on success
  - [ ] Show error toast on failure
- [ ] Update `src/pages/AddAlbum.tsx`
  - [ ] Replace mock API call with `POST /api/albums`
  - [ ] Add JWT token to headers
  - [ ] Fetch artists list from `GET /api/artists` for dropdown
  - [ ] Handle success/error responses
  - [ ] Redirect to album detail page on success
- [ ] Update `src/pages/AddSong.tsx`
  - [ ] Replace mock API call with `POST /api/songs`
  - [ ] Add JWT token to headers
  - [ ] Fetch artists list from `GET /api/artists` for dropdown
  - [ ] Fetch albums list from `GET /api/albums` for dropdown (filtered by selected artist)
  - [ ] Handle success/error responses
  - [ ] Redirect to song detail page on success

#### Update Data Display Pages
- [ ] Update `src/pages/Artists.tsx`
  - [ ] Replace mock data with `GET /api/artists`
  - [ ] Add loading state
  - [ ] Add error state
  - [ ] Add pagination controls
  - [ ] Add search functionality
- [ ] Update `src/pages/Albums.tsx`
  - [ ] Replace mock data with `GET /api/albums`
  - [ ] Add loading/error states
  - [ ] Add filter by artist
  - [ ] Add filter by genre
  - [ ] Add pagination
- [ ] Update `src/pages/Songs.tsx`
  - [ ] Replace mock data with `GET /api/songs`
  - [ ] Add loading/error states
  - [ ] Add filters (artist, album, genre)
  - [ ] Add pagination
- [ ] Update `src/pages/ArtistDetail.tsx`
  - [ ] Fetch from `GET /api/artists/:id`
  - [ ] Display artist albums
  - [ ] Display artist songs
- [ ] Update `src/pages/AlbumDetail.tsx`
  - [ ] Fetch from `GET /api/albums/:id`
  - [ ] Display album songs
- [ ] Update `src/pages/SongDetail.tsx`
  - [ ] Fetch from `GET /api/songs/:id`
  - [ ] Display full lyrics
  - [ ] Add audio player

---

## 🎯 Medium Priority

### Blog System

#### Backend
- [ ] Create `backend-api/routes/blog.js`
- [ ] POST /api/blog/posts - Create blog post
  - [ ] Validate required fields (title, content)
  - [ ] Store in blog_posts table
  - [ ] Support draft/published status
  - [ ] Support tags
  - [ ] Generate slug from title
- [ ] GET /api/blog/posts - List posts
  - [ ] Support filter by author_id
  - [ ] Support filter by status
  - [ ] Support filter by tag
  - [ ] Pagination
  - [ ] Sort by created_at (newest first)
- [ ] GET /api/blog/posts/:id - Get post by ID
  - [ ] Include author details
  - [ ] Include comments count
  - [ ] Include tags
- [ ] PUT /api/blog/posts/:id - Update post
  - [ ] Verify ownership or admin
  - [ ] Update blog_posts table
- [ ] DELETE /api/blog/posts/:id - Delete post
  - [ ] Verify ownership or admin
  - [ ] Delete post and all comments
- [ ] POST /api/blog/posts/:id/comments - Add comment
  - [ ] Validate content
  - [ ] Store in blog_comments table
  - [ ] Link to post_id
- [ ] GET /api/blog/posts/:id/comments - Get post comments
  - [ ] Query by post_id
  - [ ] Include author details
  - [ ] Sort by created_at
- [ ] DELETE /api/blog/comments/:id - Delete comment
  - [ ] Verify ownership or admin
  - [ ] Delete from blog_comments table
- [ ] Mount router in server.js: `app.use('/api/blog', blogRouter)`

#### Frontend
- [ ] Update `src/pages/Blog.tsx`
  - [ ] Fetch from `GET /api/blog/posts`
  - [ ] Add loading/error states
  - [ ] Add filter by tag
  - [ ] Add pagination
- [ ] Update `src/pages/BlogDetail.tsx`
  - [ ] Fetch from `GET /api/blog/posts/:id`
  - [ ] Fetch comments from `GET /api/blog/posts/:id/comments`
  - [ ] Add comment form
  - [ ] Handle comment submission
- [ ] Update `src/pages/BlogCreate.tsx`
  - [ ] Connect to `POST /api/blog/posts`
  - [ ] Add JWT token
  - [ ] Handle success/error
  - [ ] Support draft/publish toggle

### Voting System

#### Backend
- [ ] Create `backend-api/routes/votes.js`
- [ ] POST /api/votes - Create poll
  - [ ] Validate poll structure
  - [ ] Store in votes table
  - [ ] Return poll_id
- [ ] GET /api/votes - List polls
  - [ ] Support filter by user_id
  - [ ] Pagination
- [ ] GET /api/votes/:poll_id - Get poll results
  - [ ] Aggregate votes
  - [ ] Return counts for each option
  - [ ] Return user's vote (if any)
- [ ] POST /api/votes/:poll_id/vote - Submit vote
  - [ ] Validate vote option
  - [ ] Check user hasn't already voted (UserPollIndex)
  - [ ] Store vote
  - [ ] Return updated results
- [ ] DELETE /api/votes/:poll_id - Delete poll
  - [ ] Verify ownership or admin
  - [ ] Delete all votes
  - [ ] Delete poll
- [ ] Mount router in server.js: `app.use('/api/votes', votesRouter)`

#### Frontend
- [ ] Update `src/pages/Voting.tsx`
  - [ ] Fetch from `GET /api/votes`
  - [ ] Display active polls
  - [ ] Handle vote submission
  - [ ] Display results
  - [ ] Prevent duplicate voting

### User Profile System

#### Backend
- [ ] Create `backend-api/routes/users.js`
- [ ] GET /api/users/me - Get current user profile
  - [ ] Query users_profile table
  - [ ] Return profile + Cognito data
- [ ] PUT /api/users/me - Update profile
  - [ ] Validate fields
  - [ ] Update users_profile table
  - [ ] Handle avatar upload
- [ ] GET /api/users/:id - Get user profile (public)
  - [ ] Query users_profile table
  - [ ] Return public fields only
  - [ ] Include stats (posts count, uploads count, etc.)
- [ ] Mount router in server.js: `app.use('/api/users', usersRouter)`

#### Frontend
- [ ] Create `src/pages/Profile.tsx`
  - [ ] Fetch from `GET /api/users/me`
  - [ ] Display profile info
  - [ ] Edit profile form
  - [ ] Avatar upload
  - [ ] Display user's content (posts, uploads, etc.)
- [ ] Create `src/pages/PublicProfile.tsx`
  - [ ] Fetch from `GET /api/users/:id`
  - [ ] Display public profile
  - [ ] Display user's public content
- [ ] Add profile link to Navigation

---

## 🔧 Medium-Low Priority

### Admin Dashboard

- [ ] Create `src/pages/AdminDashboard.tsx`
- [ ] Create overview section
  - [ ] Total users count
  - [ ] Total uploads count (call `GET /api/uploads/admin/all`)
  - [ ] Total blog posts count
  - [ ] Total artists/albums/songs count
  - [ ] Storage usage (S3 API)
- [ ] Create users management section
  - [ ] List all users (Cognito API)
  - [ ] View user details
  - [ ] Add user to groups
  - [ ] Disable user
- [ ] Create content moderation section
  - [ ] List all uploads with thumbnails
  - [ ] Delete inappropriate content
  - [ ] List all blog posts
  - [ ] Delete/hide posts
- [ ] Create analytics section
  - [ ] Upload trends (chart)
  - [ ] Popular content
  - [ ] User activity
- [ ] Add route: `/admin` (protected, admin only)
- [ ] Add link in Navigation (visible to admins only)

### Enhanced Upload Features

- [ ] Add drag-and-drop upload to MyUploads page
- [ ] Add upload progress bar
- [ ] Add multiple file selection
- [ ] Add file type validation (client-side)
- [ ] Add image preview before upload
- [ ] Add image cropping/editing
- [ ] Add bulk delete
- [ ] Add bulk download (ZIP)
- [ ] Add folder organization
- [ ] Add tags/labels
- [ ] Add search functionality

### Search & Discovery

- [ ] Create unified search page
- [ ] Search artists (by name)
- [ ] Search albums (by title)
- [ ] Search songs (by title/lyrics)
- [ ] Search blog posts (by title/content)
- [ ] Implement fuzzy search
- [ ] Add filters (type, date, author)
- [ ] Add sorting options

---

## 🎨 Low Priority (Nice to Have)

### UI/UX Improvements

- [ ] Add dark/light theme toggle
- [ ] Improve mobile responsiveness
- [ ] Add loading skeletons instead of spinners
- [ ] Add animations (framer-motion)
- [ ] Add keyboard shortcuts
- [ ] Add accessibility features (ARIA labels)
- [ ] Add breadcrumbs navigation
- [ ] Add "Back to top" button
- [ ] Add toast notifications for all actions
- [ ] Improve error messages (more helpful)

### Audio Player Enhancement

- [ ] Create global audio player component
- [ ] Add play/pause controls
- [ ] Add seek bar
- [ ] Add volume control
- [ ] Add playback speed control
- [ ] Add playlist functionality
- [ ] Add shuffle/repeat
- [ ] Add lyrics sync (karaoke mode)
- [ ] Persist player state (continue playing on navigation)

### Social Features

- [ ] Add likes/favorites for songs/albums
- [ ] Add user comments on songs/albums
- [ ] Add user ratings (5-star)
- [ ] Add follow/unfollow artists
- [ ] Add user-to-user following
- [ ] Add activity feed
- [ ] Add notifications system
- [ ] Add share buttons (social media)

### Advanced Features

- [ ] Add playlists
  - [ ] Create/edit/delete playlists
  - [ ] Add songs to playlist
  - [ ] Public/private playlists
  - [ ] Share playlist link
- [ ] Add recommendations
  - [ ] Similar artists
  - [ ] Similar songs
  - [ ] "You might also like"
- [ ] Add statistics
  - [ ] Most played songs
  - [ ] Most liked albums
  - [ ] Trending artists
  - [ ] User listening history

---

## 🧪 Testing

### Unit Tests
- [ ] Backend route tests (Jest)
  - [ ] Test uploads routes
  - [ ] Test artists routes
  - [ ] Test albums routes
  - [ ] Test songs routes
  - [ ] Test blog routes
  - [ ] Test votes routes
- [ ] Frontend component tests (Vitest)
  - [ ] Test MyUploads page
  - [ ] Test admin pages
  - [ ] Test navigation
  - [ ] Test forms

### Integration Tests
- [ ] E2E tests (Playwright/Cypress)
  - [ ] Sign up flow
  - [ ] Sign in flow
  - [ ] Upload file flow
  - [ ] Create artist flow
  - [ ] Create album flow
  - [ ] Create song flow
  - [ ] Blog post flow

### Performance Tests
- [ ] Load testing (k6/JMeter)
  - [ ] Test concurrent uploads
  - [ ] Test DynamoDB query performance
  - [ ] Test S3 signed URL generation
- [ ] Stress testing
  - [ ] Test with 1000+ concurrent users
  - [ ] Test with large file uploads (50MB)

---

## 📈 Optimization

### Backend Optimization
- [ ] Add response caching (Redis)
- [ ] Add request rate limiting
- [ ] Add request validation middleware
- [ ] Optimize DynamoDB queries
  - [ ] Use batch operations
  - [ ] Implement pagination cursors
- [ ] Add image optimization
  - [ ] Resize on upload
  - [ ] Generate thumbnails
  - [ ] Convert to WebP
- [ ] Add CDN (CloudFront)
  - [ ] Serve static assets
  - [ ] Serve signed URLs via CDN

### Frontend Optimization
- [ ] Add lazy loading for images
- [ ] Add code splitting (React.lazy)
- [ ] Add service worker (PWA)
- [ ] Optimize bundle size
  - [ ] Remove unused imports
  - [ ] Tree shaking
- [ ] Add image lazy loading
- [ ] Add virtual scrolling for long lists

---

## 🔐 Security Enhancements

- [ ] Add CSRF protection
- [ ] Add rate limiting per user
- [ ] Add file virus scanning (ClamAV)
- [ ] Add content moderation (AWS Rekognition)
- [ ] Add audit logs (CloudWatch)
- [ ] Add secrets rotation (AWS Secrets Manager)
- [ ] Add WAF rules (AWS WAF)
- [ ] Add DDoS protection (AWS Shield)
- [ ] Implement Content Security Policy (CSP)
- [ ] Add input sanitization (XSS protection)

---

## 📚 Documentation

- [ ] Add JSDoc comments to all functions
- [ ] Create API documentation (Swagger/OpenAPI)
- [ ] Create architecture diagrams (draw.io)
- [ ] Create user guide
- [ ] Create video tutorials
- [ ] Add inline code comments
- [ ] Create CONTRIBUTING.md
- [ ] Create CODE_OF_CONDUCT.md
- [ ] Add changelog (CHANGELOG.md)

---

## 🚀 DevOps

### CI/CD
- [ ] Set up GitHub Actions
  - [ ] Run tests on PR
  - [ ] Lint code
  - [ ] Build frontend
  - [ ] Deploy to staging
- [ ] Set up staging environment
- [ ] Set up production deployment
  - [ ] Blue-green deployment
  - [ ] Automatic rollback on failure

### Monitoring
- [ ] Set up CloudWatch dashboards
- [ ] Add application metrics
- [ ] Add error tracking (Sentry)
- [ ] Add uptime monitoring
- [ ] Set up alerts (email/SMS)
- [ ] Add performance monitoring (New Relic/DataDog)

### Backup & Recovery
- [ ] Set up DynamoDB backups
- [ ] Set up S3 versioning (already done)
- [ ] Create disaster recovery plan
- [ ] Test restore procedures

---

## 📦 Deployment

### Production Readiness
- [ ] Set up custom domain
- [ ] Set up SSL certificate (AWS Certificate Manager)
- [ ] Configure CloudFront
- [ ] Set up Route 53
- [ ] Update CORS origins (production URLs)
- [ ] Update OAuth redirect URLs (production)
- [ ] Set up production environment variables
- [ ] Test in production-like environment

### Scaling
- [ ] Move to Lambda (serverless)
- [ ] Add DynamoDB autoscaling
- [ ] Add S3 transfer acceleration
- [ ] Add multi-region support
- [ ] Add database replication

---

## 🎯 Business Features

- [ ] Add subscription/payment system (Stripe)
- [ ] Add usage quotas
  - [ ] Free tier: 1GB storage
  - [ ] Pro tier: 10GB storage
  - [ ] Enterprise: Unlimited
- [ ] Add analytics dashboard for artists
- [ ] Add export data functionality (GDPR)
- [ ] Add terms of service
- [ ] Add privacy policy
- [ ] Add cookie consent banner

---

## ✅ Completed

- [x] Fixed OAuth redirect_uri_mismatch error
- [x] Updated Cognito domain configuration
- [x] Added Google OAuth provider
- [x] Created admin pages (AddArtist, AddAlbum, AddSong)
- [x] Designed data architecture (8 DynamoDB tables)
- [x] Created Terraform infrastructure code
- [x] Created S3 user_uploads bucket configuration
- [x] Created backend uploads API (5 endpoints)
- [x] Created MyUploads frontend page
- [x] Updated auth middleware (support admin role)
- [x] Integrated uploads routes in server.js
- [x] Created comprehensive documentation
- [x] Created implementation guide
- [x] Created quick start commands

---

## 📊 Progress Tracking

**Phase 1: Foundation** ✅ COMPLETE
- Infrastructure design ✅
- Authentication setup ✅
- Basic admin pages ✅
- Upload system ✅
- Documentation ✅

**Phase 2: Core Features** 🔄 IN PROGRESS
- Deploy infrastructure ⏳
- Test upload system ⏳
- Create artists/albums/songs APIs ⏳
- Connect admin pages to APIs ⏳
- Update data display pages ⏳

**Phase 3: Enhanced Features** ⏳ NOT STARTED
- Blog system
- Voting system
- User profiles
- Admin dashboard

**Phase 4: Polish** ⏳ NOT STARTED
- Testing
- Optimization
- Security hardening
- Production deployment

---

**Last Updated:** January 15, 2024

**Current Focus:** Deploy infrastructure and test upload system

**Blocking Issues:** None

**Next Action:** Run `terraform apply` in terraform directory
