# 🏗️ Architecture Diagram

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           LYRICSCAPE CREATIONS                          │
│                    Music Management & Content Platform                  │
└─────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│                            FRONTEND (Port 8089)                        │
├───────────────────────────────────────────────────────────────────────┤
│  Framework: React 18 + TypeScript + Vite                             │
│  UI: shadcn/ui + Tailwind CSS + Framer Motion                        │
│                                                                        │
│  Pages:                                                               │
│  ├─ Home                    - Landing page                            │
│  ├─ Artists                 - Artist catalog                          │
│  ├─ Albums                  - Album catalog                           │
│  ├─ Songs                   - Song catalog                            │
│  ├─ MyUploads               - User file dashboard [NEW]               │
│  ├─ AddArtist               - Create artist (admin)                   │
│  ├─ AddAlbum                - Create album (admin)                    │
│  ├─ AddSong                 - Create song (admin)                     │
│  ├─ Blog                    - Blog listing                            │
│  ├─ Voting                  - Polls/voting                            │
│  ├─ LyricsCardMaker         - Lyrics card tool                        │
│  └─ S3ImageManager          - Image management                        │
└───────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS (JWT Token)
                                    ▼
┌───────────────────────────────────────────────────────────────────────┐
│                           BACKEND API (Port 3000)                      │
├───────────────────────────────────────────────────────────────────────┤
│  Runtime: Node.js + Express                                           │
│  Auth: AWS Cognito JWT Verification                                   │
│                                                                        │
│  Endpoints:                                                           │
│  ├─ POST   /api/uploads              - Upload file [NEW]              │
│  ├─ GET    /api/uploads              - List user uploads [NEW]        │
│  ├─ GET    /api/uploads/:id          - Get upload [NEW]               │
│  ├─ DELETE /api/uploads/:id          - Delete upload [NEW]            │
│  ├─ GET    /api/uploads/admin/all    - Admin view all [NEW]           │
│  ├─ GET    /api/s3/images            - List S3 images                 │
│  ├─ POST   /api/s3/upload            - Upload to S3                   │
│  ├─ DELETE /api/s3/delete            - Delete from S3                 │
│  ├─ GET    /api/dynamodb/records     - Get DynamoDB records           │
│  └─ GET    /api/health               - Health check                   │
│                                                                        │
│  Middleware:                                                          │
│  ├─ verifyToken                      - JWT verification [UPDATED]     │
│  ├─ requireAdmin                     - Admin check [NEW]               │
│  └─ multer                           - File upload [NEW]               │
└───────────────────────────────────────────────────────────────────────┘
                      │                           │
                      │                           │
            ┌─────────┴──────────┐    ┌──────────┴────────────┐
            ▼                    ▼    ▼                       ▼
┌──────────────────────┐  ┌────────────────────┐  ┌──────────────────────┐
│   AWS COGNITO        │  │    AWS S3          │  │   AWS DYNAMODB       │
│   (Authentication)   │  │    (Storage)       │  │   (Database)         │
├──────────────────────┤  ├────────────────────┤  ├──────────────────────┤
│                      │  │                    │  │                      │
│ User Pool:           │  │ Bucket 1:          │  │ Table 1:             │
│ eu-north-1_e4j7eAxOe │  │ lyricscape-lyrics- │  │ instagram-uploads    │
│                      │  │ images-prod        │  │                      │
│ Client ID:           │  │                    │  │ Table 2: [NEW]       │
│ nqvnmimojggjpuvfk... │  │ Bucket 2: [NEW]    │  │ user-uploads         │
│                      │  │ lyricscape-user-   │  │                      │
│ Providers:           │  │ uploads-prod       │  │ Table 3: [NEW]       │
│ ├─ Email/Password    │  │                    │  │ users-profile        │
│ └─ Google OAuth      │  │ Structure:         │  │                      │
│                      │  │ users/             │  │ Table 4: [NEW]       │
│ Groups:              │  │ ├─ {user_id}/      │  │ blog-posts           │
│ ├─ Users (default)   │  │    ├─ images/      │  │                      │
│ └─ Admins            │  │    ├─ audio/       │  │ Table 5: [NEW]       │
│                      │  │    ├─ documents/   │  │ blog-comments        │
│ Features:            │  │    ├─ temp/        │  │                      │
│ ├─ MFA Support       │  │    └─ general/     │  │ Table 6: [NEW]       │
│ ├─ Password Policy   │  │                    │  │ votes                │
│ └─ Email Verification│  │ Features:          │  │                      │
│                      │  │ ├─ Lifecycle (30d) │  │ Table 7: [NEW]       │
└──────────────────────┘  │ ├─ Versioning      │  │ artists              │
                          │ ├─ Encryption      │  │                      │
                          │ ├─ CORS            │  │ Table 8: [NEW]       │
                          │ ├─ TLS-only        │  │ albums               │
                          │ └─ Signed URLs     │  │                      │
                          │                    │  │ Table 9: [NEW]       │
                          └────────────────────┘  │ songs                │
                                                  │                      │
                                                  │ All with:            │
                                                  │ ├─ GSI indexes       │
                                                  │ ├─ On-demand billing │
                                                  │ └─ TTL support       │
                                                  └──────────────────────┘
```

---

## Data Flow Diagrams

### 1. File Upload Flow

```
┌──────────┐
│  User    │ 1. Clicks "Upload File"
└────┬─────┘
     │
     │ 2. Selects file
     ▼
┌──────────────────────┐
│  MyUploads.tsx       │ 3. FormData with file
└────┬─────────────────┘
     │
     │ 4. POST /api/uploads
     │    Headers: Bearer {JWT}
     ▼
┌──────────────────────┐
│  verifyToken         │ 5. Verify JWT
│  Middleware          │    Extract user_id
└────┬─────────────────┘
     │
     │ 6. User authenticated
     ▼
┌──────────────────────┐
│  Multer              │ 7. Parse multipart/form-data
│  Middleware          │    Extract file from request
└────┬─────────────────┘
     │
     │ 8. File buffer
     ▼
┌──────────────────────┐
│  uploads.js          │ 9. Generate upload_id
│  Route Handler       │    Build S3 key: users/{user_id}/{category}/{upload_id}.ext
└────┬─────────────────┘
     │
     ├──────────────────────────────┬─────────────────────────────┐
     │                              │                             │
     │ 10. PutObject                │ 12. PutItem                 │
     ▼                              ▼                             ▼
┌──────────────────────┐      ┌──────────────────────┐     ┌──────────────┐
│  S3 Bucket           │      │  DynamoDB            │     │  S3 Presigner│
│  user-uploads        │      │  user_uploads table  │     └──────┬───────┘
└──────────────────────┘      └──────────────────────┘            │
     │                              │                             │
     │ 11. File stored              │ 13. Metadata stored         │
     │                              │                             │
     └──────────────────────────────┴─────────────────────────────┤
                                                                   │
                                                      14. Generate signed URL
                                                                   │
┌──────────────────────┐                                          │
│  Response            │ ◄────────────────────────────────────────┘
│  {                   │ 15. Return to frontend
│    upload_id,        │
│    filename,         │
│    url (signed),     │
│    ...               │
│  }                   │
└────┬─────────────────┘
     │
     │ 16. Display in grid
     ▼
┌──────────┐
│  User    │ Sees uploaded file
└──────────┘
```

### 2. File List Flow

```
┌──────────┐
│  User    │ 1. Visits /my-uploads
└────┬─────┘
     │
     ▼
┌──────────────────────┐
│  MyUploads.tsx       │ 2. useEffect() on mount
└────┬─────────────────┘
     │
     │ 3. GET /api/uploads
     │    Headers: Bearer {JWT}
     ▼
┌──────────────────────┐
│  verifyToken         │ 4. Verify JWT
│  Middleware          │    Extract user_id
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│  uploads.js          │ 5. Query DynamoDB
│  Route Handler       │    UserUploadsIndex
└────┬─────────────────┘    where user_id = req.user.id
     │
     │ 6. QueryCommand
     ▼
┌──────────────────────┐
│  DynamoDB            │ 7. Return items
│  user_uploads table  │    sorted by created_at
└────┬─────────────────┘
     │
     │ 8. For each item
     ▼
┌──────────────────────┐
│  S3 Presigner        │ 9. Generate signed URL
└────┬─────────────────┘    (1-hour expiration)
     │
     │ 10. Array of uploads with URLs
     ▼
┌──────────────────────┐
│  Response            │ 11. Return to frontend
│  {                   │
│    uploads: [...]    │
│  }                   │
└────┬─────────────────┘
     │
     │ 12. Render grid
     ▼
┌──────────┐
│  User    │ Sees all files
└──────────┘
```

### 3. Authentication Flow

```
┌──────────┐
│  User    │ 1. Clicks "Sign In with Google"
└────┬─────┘
     │
     ▼
┌──────────────────────┐
│  AWS Amplify         │ 2. Redirect to Google OAuth
│  (Frontend)          │
└────┬─────────────────┘
     │
     ▼
┌──────────────────────┐
│  Google OAuth        │ 3. User approves
└────┬─────────────────┘
     │
     │ 4. OAuth code
     ▼
┌──────────────────────┐
│  AWS Cognito         │ 5. Exchange code for tokens
└────┬─────────────────┘
     │
     │ 6. JWT tokens (access + ID)
     ▼
┌──────────────────────┐
│  AWS Amplify         │ 7. Store tokens
│  (Frontend)          │    localStorage
└────┬─────────────────┘
     │
     │ 8. Tokens stored
     ▼
┌──────────┐
│  User    │ Authenticated
└──────────┘

When making API calls:

┌──────────────────────┐
│  Frontend            │ 1. Get token from storage
└────┬─────────────────┘
     │
     │ 2. Add to headers:
     │    Authorization: Bearer {token}
     ▼
┌──────────────────────┐
│  Backend API         │ 3. Extract token
└────┬─────────────────┘
     │
     │ 4. Token
     ▼
┌──────────────────────┐
│  AWS Cognito         │ 5. Verify signature
│  JWT Verifier        │    Check expiration
└────┬─────────────────┘    Extract claims
     │
     │ 6. Valid? Yes
     ▼
┌──────────────────────┐
│  Route Handler       │ 7. req.user = {
│                      │      id: sub,
│                      │      email,
│                      │      groups,
│                      │      isAdmin
│                      │    }
└──────────────────────┘
```

### 4. Access Control Flow

```
User uploads file:

┌──────────────────────┐
│  S3 Key Structure    │
│                      │
│  users/              │ ◄─── Base path
│  └─ abc123.../       │ ◄─── user_id (from JWT)
│     ├─ images/       │ ◄─── category
│     │  └─ xyz.jpg    │ ◄─── upload_id.ext
│     ├─ audio/        │
│     ├─ documents/    │
│     ├─ temp/         │ ◄─── Auto-deleted after 30 days
│     └─ general/      │
└──────────────────────┘

User tries to list files:

┌──────────────────────┐
│  Regular User        │
│  user_id: abc123     │
└────┬─────────────────┘
     │
     │ GET /api/uploads
     ▼
┌──────────────────────┐
│  Backend             │ Query where user_id = 'abc123'
└────┬─────────────────┘
     │
     │ Returns only user's files
     ▼
┌──────────────────────┐
│  Response            │ [file1, file2, file3]
└──────────────────────┘


Admin tries to list all files:

┌──────────────────────┐
│  Admin User          │
│  isAdmin: true       │
└────┬─────────────────┘
     │
     │ GET /api/uploads/admin/all
     ▼
┌──────────────────────┐
│  requireAdmin        │ Check req.user.isAdmin
│  Middleware          │
└────┬─────────────────┘
     │
     │ Allowed ✓
     ▼
┌──────────────────────┐
│  Backend             │ Scan entire table
└────┬─────────────────┘ (all users)
     │
     │ Returns ALL files
     ▼
┌──────────────────────┐
│  Response            │ [file1, file2, file3, file4, ...]
└──────────────────────┘ (from all users)
```

---

## Infrastructure as Code

```
┌─────────────────────────────────────────────────────────────────────┐
│                            TERRAFORM                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  main.tf (~1000 lines)                                              │
│  ├─ AWS Provider (region: eu-north-1)                               │
│  ├─ Cognito User Pool                                               │
│  │  ├─ Email/Password                                               │
│  │  ├─ Google OAuth                                                 │
│  │  ├─ Domain: lyricscape-prod.auth.eu-north-1.amazoncognito.com   │
│  │  └─ Callbacks: localhost:8089, localhost:8090                   │
│  ├─ S3 Bucket: lyrics-images                                        │
│  ├─ S3 Bucket: user-uploads [NEW]                                   │
│  │  ├─ Lifecycle: 30-day temp file deletion                         │
│  │  ├─ Versioning: enabled                                          │
│  │  ├─ Encryption: AES256                                           │
│  │  ├─ CORS: localhost:8089, 8090                                   │
│  │  └─ Policy: TLS-only                                             │
│  ├─ DynamoDB: instagram-uploads                                     │
│  └─ DynamoDB Tables [NEW]                                           │
│     ├─ users-profile                                                │
│     ├─ blog-posts                                                   │
│     ├─ blog-comments                                                │
│     ├─ votes                                                        │
│     ├─ user-uploads (with TTL)                                      │
│     ├─ artists                                                      │
│     ├─ albums                                                       │
│     └─ songs                                                        │
│                                                                     │
│  variables.tf                                                       │
│  ├─ aws_region                                                      │
│  ├─ cognito_callback_urls                                           │
│  ├─ google_client_id                                                │
│  ├─ google_client_secret                                            │
│  └─ user_uploads_retention_days [NEW]                               │
│                                                                     │
│  outputs.tf                                                         │
│  ├─ cognito_user_pool_id                                            │
│  ├─ cognito_client_id                                               │
│  ├─ s3_bucket_name                                                  │
│  ├─ user_uploads_bucket_name [NEW]                                  │
│  └─ dynamodb_tables [NEW]                                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ terraform apply
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          AWS CLOUD                                  │
│                     (Region: eu-north-1)                            │
│                                                                     │
│  ✓ 1 Cognito User Pool                                              │
│  ✓ 2 S3 Buckets                                                     │
│  ✓ 9 DynamoDB Tables                                                │
│  ✓ IAM Roles & Policies                                             │
│  ✓ Lifecycle Rules                                                  │
│  ✓ Encryption Configurations                                        │
│  ✓ CORS Configurations                                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
┌──────────────────────────────────────────────────────────────────┐
│                         FRONTEND STACK                            │
├──────────────────────────────────────────────────────────────────┤
│  Core:                                                           │
│  ├─ React 18              - UI framework                         │
│  ├─ TypeScript            - Type safety                          │
│  ├─ Vite                  - Build tool (HMR)                     │
│  └─ React Router v6       - Client-side routing                  │
│                                                                  │
│  UI:                                                             │
│  ├─ shadcn/ui             - Component library                    │
│  ├─ Tailwind CSS          - Utility-first CSS                    │
│  ├─ Lucide Icons          - Icon library                         │
│  └─ Framer Motion         - Animations                           │
│                                                                  │
│  State:                                                          │
│  ├─ TanStack Query        - Server state                         │
│  ├─ React Hooks           - Local state                          │
│  └─ Context API           - Global state                         │
│                                                                  │
│  Auth:                                                           │
│  └─ AWS Amplify           - Cognito integration                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                         BACKEND STACK                             │
├──────────────────────────────────────────────────────────────────┤
│  Runtime:                                                        │
│  ├─ Node.js 18+           - JavaScript runtime                   │
│  └─ Express               - Web framework                        │
│                                                                  │
│  Middleware:                                                     │
│  ├─ cors                  - CORS handling                        │
│  ├─ multer                - File upload                          │
│  └─ aws-jwt-verify        - JWT verification                     │
│                                                                  │
│  AWS SDK:                                                        │
│  ├─ @aws-sdk/client-s3    - S3 operations                        │
│  ├─ @aws-sdk/client-dynamodb - DynamoDB operations               │
│  ├─ @aws-sdk/lib-dynamodb - DynamoDB Document Client             │
│  └─ @aws-sdk/s3-request-presigner - Signed URLs                  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE STACK                         │
├──────────────────────────────────────────────────────────────────┤
│  IaC:                                                            │
│  └─ Terraform             - Infrastructure as Code               │
│                                                                  │
│  Database:                                                       │
│  └─ AWS DynamoDB          - NoSQL database (9 tables)            │
│                                                                  │
│  Storage:                                                        │
│  └─ AWS S3                - Object storage (2 buckets)           │
│                                                                  │
│  Auth:                                                           │
│  └─ AWS Cognito           - User authentication                  │
│                                                                  │
│  Region:                                                         │
│  └─ eu-north-1            - Stockholm                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## File Structure Tree

```
lyricscape-creations/
│
├── src/                           # Frontend source code
│   ├── components/                # Reusable React components
│   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   └── ... (40+ components)
│   │   ├── AlbumCard.tsx
│   │   ├── ArtistCard.tsx
│   │   ├── Navigation.tsx
│   │   ├── SongRow.tsx
│   │   ├── AuthProvider.tsx
│   │   └── ProtectedRoute.tsx
│   │
│   ├── pages/                    # Page components
│   │   ├── Home.tsx
│   │   ├── Artists.tsx
│   │   ├── Albums.tsx
│   │   ├── Songs.tsx
│   │   ├── MyUploads.tsx         # [NEW] User upload dashboard
│   │   ├── AddArtist.tsx         # Admin: Create artist
│   │   ├── AddAlbum.tsx          # Admin: Create album
│   │   ├── AddSong.tsx           # Admin: Create song
│   │   ├── Blog.tsx
│   │   ├── Voting.tsx
│   │   ├── LyricsCardMaker.tsx
│   │   ├── S3ImageManager.tsx
│   │   └── NotFound.tsx
│   │
│   ├── lib/                      # Utilities and configs
│   │   ├── api.ts               # API client
│   │   ├── utils.ts             # Helper functions
│   │   └── amplify-config.ts    # AWS Amplify config
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── use-toast.ts
│   │   ├── use-mobile.tsx
│   │   └── useDebounce.ts
│   │
│   ├── data/                     # Seed data
│   │   └── seed.json
│   │
│   ├── App.tsx                   # Main app component
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Global styles
│
├── backend-api/                   # Backend API server
│   ├── routes/                   # Route handlers
│   │   └── uploads.js           # [NEW] File upload routes
│   │
│   ├── middleware/               # Express middleware
│   │   └── auth.js              # [UPDATED] JWT verification + admin
│   │
│   ├── server.js                 # [UPDATED] Express server
│   ├── .env.example             # [NEW] Environment template
│   ├── .env                      # Environment variables (gitignored)
│   └── package.json              # Dependencies
│
├── terraform/                     # Infrastructure as Code
│   ├── main.tf                   # [UPDATED] +543 lines (8 tables, 1 bucket)
│   ├── variables.tf              # [UPDATED] +1 variable
│   ├── outputs.tf                # [UPDATED] +3 outputs
│   ├── terraform.tfvars          # Variable values (gitignored)
│   └── .terraform/               # Terraform state
│
├── public/                        # Static assets
│   ├── favicon.ico
│   ├── placeholder.svg
│   └── robots.txt
│
├── docs/                          # Documentation
│   ├── QUICK_START.md            # [NEW] Quick start commands
│   ├── IMPLEMENTATION_GUIDE.md   # [NEW] Detailed guide
│   ├── SUMMARY.md                # [NEW] Architecture summary
│   ├── TODO.md                   # [NEW] Roadmap
│   ├── WHATS_NEXT.md             # [NEW] Next steps
│   ├── ARCHITECTURE.md           # [NEW] This file
│   ├── AUTH_TESTING_GUIDE.md     # Auth testing
│   └── ADMIN_PAGES_GUIDE.md      # Admin features
│
├── README.md                      # [UPDATED] Project overview
├── package.json                   # Frontend dependencies
├── tsconfig.json                  # TypeScript config
├── vite.config.ts                 # Vite config
├── tailwind.config.ts             # Tailwind config
├── components.json                # shadcn/ui config
└── .gitignore                     # Git ignore rules
```

---

## Deployment Flow

```
Developer Machine                    AWS Cloud
┌─────────────────┐                 ┌─────────────────┐
│                 │                 │                 │
│  Write Code     │                 │                 │
│  ├─ main.tf     │                 │                 │
│  ├─ server.js   │                 │                 │
│  └─ App.tsx     │                 │                 │
│                 │                 │                 │
└────────┬────────┘                 └─────────────────┘
         │
         │ terraform apply
         ▼
┌─────────────────┐                 ┌─────────────────┐
│  Terraform      │  ──────────────►│  Create         │
│  CLI            │  API Calls      │  Resources      │
└─────────────────┘                 │  ├─ Cognito     │
                                    │  ├─ S3          │
         │                          │  └─ DynamoDB    │
         │                          └─────────────────┘
         ▼
┌─────────────────┐
│  npm install    │                 ┌─────────────────┐
│  Dependencies   │                 │  npm Registry   │
└────────┬────────┘                 └─────────────────┘
         │
         ▼
┌─────────────────┐                 ┌─────────────────┐
│  node server.js │  ──────────────►│  Backend API    │
│  Backend Start  │  Connects to    │  Running        │
└────────┬────────┘                 │  Port 3000      │
         │                          └─────────────────┘
         │
         ▼
┌─────────────────┐                 ┌─────────────────┐
│  npm run dev    │  ──────────────►│  Frontend       │
│  Frontend Start │  HMR            │  Running        │
└────────┬────────┘                 │  Port 8089      │
         │                          └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Open Browser   │
│  localhost:8089 │
│                 │
│  User Testing   │
│  ├─ Sign In     │
│  ├─ Upload File │
│  ├─ View Files  │
│  └─ Delete File │
└─────────────────┘
```

---

**Legend:**
- [NEW] = Newly created in this session
- [UPDATED] = Modified in this session
- Regular = Existing files

**Total New Infrastructure:**
- 8 DynamoDB tables
- 1 S3 bucket
- 543 lines Terraform
- 340 lines backend route
- 250 lines frontend page
- 2000+ lines documentation

**Ready to deploy!** 🚀
