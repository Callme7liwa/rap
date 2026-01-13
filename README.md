# 🎵 Lyricscape Creations

A comprehensive music management platform with user-generated content, lyrics card creation, and social features.

## ✨ Features

### 🎨 Content Creation
- **Lyrics Card Maker** - Create beautiful lyric cards for Instagram/social media
- **Music Catalog** - Manage artists, albums, and songs
- **Blog System** - Write and share music-related content
- **Voting System** - Create polls and engage with the community

### 📁 File Management
- **User Uploads** - Upload and manage images, audio files, and documents
- **S3 Integration** - Secure cloud storage with automatic cleanup
- **Category Organization** - Organize files by type (images, audio, documents)
- **Private/Public Sharing** - Control file visibility

### 🔐 Authentication
- **Email/Password Auth** - Traditional authentication via AWS Cognito
- **Google OAuth** - Sign in with Google
- **Role-Based Access** - User and admin roles
- **Protected Routes** - Secure pages require authentication

### 👨‍💼 Admin Features
- **Add Artists** - Create artist profiles with images
- **Add Albums** - Create albums with cover art and metadata
- **Add Songs** - Create songs with audio files, lyrics, and metadata
- **Content Management** - Full control over all content

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured
- Terraform installed
- AWS account with appropriate permissions

### 1. Clone Repository

```bash
git clone <YOUR_GIT_URL>
cd lyricscape-creations
```

### 2. Deploy Infrastructure

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

This creates:
- 8 DynamoDB tables
- 2 S3 buckets
- AWS Cognito User Pool
- All necessary configurations

### 3. Install Dependencies

```bash
# Backend
cd ../backend-api
npm install

# Frontend
cd ..
npm install
```

### 4. Configure Environment

```bash
# Backend
cd backend-api
cp .env.example .env
# Edit .env with your AWS credentials and table names
```

### 5. Start Services

```bash
# Terminal 1: Backend
cd backend-api
node server.js

# Terminal 2: Frontend (new terminal)
cd lyricscape-creations
npm run dev
```

Visit `http://localhost:8089`

---

## 📚 Documentation

Comprehensive guides for every aspect of the project:

- **[QUICK_START.md](./QUICK_START.md)** - Step-by-step deployment commands
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Detailed implementation walkthrough
- **[SUMMARY.md](./SUMMARY.md)** - Architecture overview and components
- **[TODO.md](./TODO.md)** - Roadmap and pending tasks
- **[AUTH_TESTING_GUIDE.md](./AUTH_TESTING_GUIDE.md)** - Authentication testing procedures
- **[ADMIN_PAGES_GUIDE.md](./ADMIN_PAGES_GUIDE.md)** - Admin features documentation

---

## 🏗️ Architecture

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **UI Library:** shadcn/ui + Tailwind CSS
- **State Management:** TanStack Query
- **Routing:** React Router v6
- **Auth:** AWS Amplify

### Backend
- **Runtime:** Node.js + Express
- **Authentication:** AWS Cognito JWT
- **File Upload:** Multer
- **AWS SDK:** v3 (S3, DynamoDB)

### Infrastructure
- **IaC:** Terraform
- **Database:** AWS DynamoDB (8 tables)
- **Storage:** AWS S3 (2 buckets)
- **Auth:** AWS Cognito
- **Region:** eu-north-1 (Stockholm)

### Database Tables
1. **users_profile** - Extended user data
2. **blog_posts** - Blog content
3. **blog_comments** - Comments system
4. **votes** - Voting/polling
5. **user_uploads** - File metadata (with TTL)
6. **artists** - Artist profiles
7. **albums** - Album data
8. **songs** - Song catalog

---

## 🔌 API Endpoints

### Uploads
```
POST   /api/uploads           - Upload file
GET    /api/uploads           - List user's uploads
GET    /api/uploads/:id       - Get single upload
DELETE /api/uploads/:id       - Delete upload
GET    /api/uploads/admin/all - Admin: view all uploads
```

### Legacy S3 (Instagram)
```
GET    /api/s3/images         - List images
POST   /api/s3/upload         - Upload images
DELETE /api/s3/delete         - Delete image
```

### DynamoDB
```
GET    /api/dynamodb/records  - Get Instagram upload history
```

### Health
```
GET    /api/health            - Health check
```

---

## 🎨 Tech Stack

### Core Technologies
- React 18
- TypeScript
- Vite
- Node.js
- Express
- AWS SDK v3

### UI Components
- shadcn/ui
- Tailwind CSS
- Lucide Icons
- Framer Motion

### Database & Storage
- AWS DynamoDB
- AWS S3
- AWS Cognito

### DevOps
- Terraform
- AWS CLI
- GitHub

---

## 📁 Project Structure

```
lyricscape-creations/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── lib/            # Utilities and configs
│   ├── hooks/          # Custom React hooks
│   └── data/           # Seed data
├── backend-api/
│   ├── routes/         # API route handlers
│   ├── middleware/     # Express middleware
│   └── server.js       # Express server
├── terraform/
│   ├── main.tf         # Infrastructure definitions
│   ├── variables.tf    # Terraform variables
│   └── outputs.tf      # Terraform outputs
├── public/             # Static assets
└── docs/               # Documentation
```

---

## 🔐 Security

### Authentication
- JWT token verification
- AWS Cognito integration
- Role-based access control (RBAC)
- Protected routes and endpoints

### Data Protection
- Server-side encryption (S3)
- TLS-only policy
- Signed URLs (1-hour expiration)
- User folder isolation

### Access Control
- Users see only their own files
- Admins have full access
- Row-level security (DynamoDB)

---

## 🧪 Testing

### Manual Testing
1. Sign up/Sign in
2. Upload files to My Uploads
3. Create artists/albums/songs (admin)
4. Verify in AWS Console (S3, DynamoDB)
5. Test download/delete

### AWS Console Verification
- **S3:** Check `users/{user_id}/` folders
- **DynamoDB:** Verify metadata in tables
- **Cognito:** Check user pool and groups

---

## 🚧 Current Status

### ✅ Completed
- Infrastructure design (Terraform)
- Authentication (Cognito + Google OAuth)
- File upload system (S3 + DynamoDB)
- Admin pages (Add Artist/Album/Song)
- User uploads dashboard
- Comprehensive documentation

### 🔄 In Progress
- Infrastructure deployment (terraform apply)
- Backend API integration
- Testing upload system

### ⏳ Planned
- Artists/Albums/Songs API routes
- Blog system API
- Voting system API
- Admin dashboard
- Content search
- Social features

See [TODO.md](./TODO.md) for full roadmap.

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📄 License

This project is private and proprietary.

---

## 🆘 Support

### Getting Help
- Check documentation files in root directory
- Review [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
- Check [TODO.md](./TODO.md) for known issues

### Common Issues

**"redirect_uri_mismatch"**
- Check Cognito callback URLs include your port (8089/8090)
- Verify domain is fully qualified

**"Failed to upload file"**
- Check backend is running (port 3000)
- Verify AWS credentials in `.env`
- Check S3 bucket exists

**"Token verification failed"**
- Sign out and sign in again
- Check Cognito configuration
- Verify JWT token in browser DevTools

---

## 🎯 Project Goals

1. **User Empowerment** - Enable users to create and share content
2. **Content Management** - Comprehensive music catalog system
3. **Community Building** - Blog and voting features
4. **Security** - Enterprise-grade authentication and authorization
5. **Scalability** - Built on AWS serverless architecture
6. **Developer Experience** - Clean code, good docs, easy deployment

---

## 📊 Stats

- **Frontend Lines:** ~5000 (TypeScript + React)
- **Backend Lines:** ~1000 (Node.js + Express)
- **Infrastructure Lines:** ~1000 (Terraform)
- **Documentation Lines:** ~2000 (Markdown)
- **Total Components:** 30+ UI components
- **API Endpoints:** 10+ (with 20+ planned)
- **Database Tables:** 9 (1 existing + 8 new)
- **S3 Buckets:** 2

---

## 🌟 Highlights

### Performance
- Sub-second page loads
- Lazy loading for images
- Efficient DynamoDB queries
- S3 signed URLs for direct downloads

### Design
- Glass morphism UI
- Dark mode support
- Responsive design
- Smooth animations (Framer Motion)
- Accessible components (shadcn/ui)

### Developer Experience
- TypeScript for type safety
- Hot module replacement (Vite)
- Clear error messages
- Comprehensive documentation
- Easy local development

---

**Built with ❤️ for music lovers**
