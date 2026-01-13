# Authentication Setup Guide

This guide walks you through setting up AWS Cognito authentication for LyricScape Creations.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform installed (>= 1.0)
- Node.js and npm installed

## Setup Steps

### 1. Install Dependencies

Frontend dependencies (already installed):
```bash
npm install aws-amplify @aws-amplify/ui-react
```

Backend dependencies (already installed):
```bash
cd backend-api
npm install aws-jwt-verify
```

### 2. Deploy Cognito with Terraform

Navigate to the terraform directory and apply the configuration:

```bash
cd terraform
terraform init
terraform plan
terraform apply
```

After applying, Terraform will output the following values:
- `cognito_user_pool_id` - Your Cognito User Pool ID
- `cognito_client_id` - Your Cognito App Client ID
- `cognito_domain` - Your Cognito domain
- `cognito_issuer_url` - JWT issuer URL

**Save these values** - you'll need them in the next step.

### 3. Configure Environment Variables

#### Frontend (.env in root directory)

Create a `.env` file in the project root with:

```bash
VITE_COGNITO_USER_POOL_ID=<from terraform output>
VITE_COGNITO_CLIENT_ID=<from terraform output>
VITE_COGNITO_DOMAIN=<from terraform output>
VITE_COGNITO_REDIRECT_SIGN_IN=http://localhost:5173
VITE_COGNITO_REDIRECT_SIGN_OUT=http://localhost:5173
VITE_API_ENDPOINT=http://localhost:3000/api
```

#### Backend (backend-api/.env)

Update `backend-api/.env` with:

```bash
COGNITO_USER_POOL_ID=<from terraform output>
COGNITO_CLIENT_ID=<from terraform output>
```

### 4. Start the Application

Start the backend:
```bash
cd backend-api
npm start
```

Start the frontend (in a separate terminal):
```bash
npm run dev
```

### 5. Test Authentication

1. Visit http://localhost:5173
2. Click the "Sign In" button in the top right
3. Create a new account:
   - Enter your email
   - Create a strong password (min 8 chars, uppercase, lowercase, numbers, symbols)
   - Enter your name
4. Check your email for verification code
5. Enter the verification code
6. You should be automatically redirected to the home page
7. You'll see your user menu in the top right navigation

## Features

### Public Pages (No Authentication Required)
- Home
- Artists
- Albums
- Songs
- Blog listing
- Blog posts (read-only)
- Search
- Voting (view results)

### Protected Pages (Authentication Required)
- Blog Create (`/blog/create`) - Create new blog posts
- More features can be protected by wrapping routes with `<ProtectedRoute>`

### User Menu
When signed in, you'll see a user icon in the navigation with:
- User email displayed
- Create Post (quick access to blog creation)
- Voting (quick access)
- Sign Out button

### Design & Styling
The login page features:
- **Matching Color Palette**: Indigo/violet gradient system matching your app's theme
- **Dark Mode Support**: Automatically syncs with your app's dark mode toggle
- **Glass Morphism**: Modern frosted glass effect matching the navigation
- **Smooth Animations**: Framer Motion entrance animations
- **Responsive Design**: Optimized for all screen sizes
- **Custom Amplify Styling**: AWS Amplify UI components styled to match your app's design system

## Authentication Flow

### Login/Registration
1. User clicks "Sign In" button
2. Redirected to `/login` page
3. AWS Amplify Authenticator component handles:
   - Sign up (email verification)
   - Sign in (with email/password)
   - Forgot password flow
   - Email verification
4. After successful auth, user is redirected to home page
5. JWT tokens are stored securely by Amplify

### Protected Routes
1. Component `ProtectedRoute` checks if user is authenticated
2. If not authenticated, redirects to `/login`
3. If authenticated, renders the protected component

### API Authentication
Use the `authenticatedFetch` helper for API calls:

```typescript
import { authenticatedFetch } from '@/lib/authenticated-fetch';

// Make authenticated request
const response = await authenticatedFetch('/api/blog/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'My Post', content: '...' })
});
```

This automatically:
- Gets the current JWT token from Amplify
- Adds it to the Authorization header
- Makes the request

### Backend Token Verification
Protected backend routes use the `verifyToken` middleware:

```javascript
const { verifyToken } = require('./middleware/auth');

// Protected route example
app.post('/api/blog/posts', verifyToken, async (req, res) => {
  // req.user contains verified user info from JWT
  const { sub, email, name } = req.user;
  
  // Your logic here
});
```

The middleware:
- Extracts JWT from Authorization header
- Verifies it with AWS Cognito
- Adds user info to `req.user`
- Returns 401 if token is invalid/expired

## Customization

### Adding OAuth Providers (Google, Facebook)

1. Uncomment the provider sections in `terraform/main.tf`
2. Add variables to `terraform/variables.tf`:
   ```terraform
   variable "google_client_id" {
     type = string
   }
   variable "google_client_secret" {
     type = string
     sensitive = true
   }
   ```
3. Update `src/pages/Login.tsx` to include the provider:
   ```typescript
   <Authenticator
     socialProviders={['google', 'facebook']}
     // ... other props
   />
   ```
4. Run `terraform apply`

### Customizing the Login Page

The login page uses AWS Amplify UI components with a custom theme that matches your app's indigo/violet color palette.

**Current Features:**
- Dark mode toggle button (top right)
- Automatic theme detection on load
- Glass morphism effect matching navigation
- Framer Motion animations
- Gradient backgrounds matching home page
- Custom Amplify component styling

**To further customize**, edit `src/pages/Login.tsx`:
- Update `lightTheme` and `darkTheme` objects to change colors
- Modify the header sections to add custom branding
- Adjust the glass effect and animations
- Add custom footer content

**CSS Customization:**
The Amplify UI components are styled in `src/index.css` under the components layer. You can modify:
- Input field styling
- Button appearance
- Tab styling
- Error message formatting
- Social provider buttons

### Adding More User Attributes

1. Add schema in `terraform/main.tf`:
   ```terraform
   schema {
     name                = "custom_attribute"
     attribute_data_type = "String"
     required            = false
     mutable             = true
   }
   ```
2. Update `read_attributes` and `write_attributes` in the User Pool Client
3. Run `terraform apply`

## Protecting Additional Routes

Wrap any route with `ProtectedRoute`:

```typescript
<Route 
  path="/tools/lyrics-card" 
  element={<ProtectedRoute><LyricsCardMaker /></ProtectedRoute>} 
/>
```

Or check auth status in components:

```typescript
import { useAuthenticator } from '@aws-amplify/ui-react';

function MyComponent() {
  const { user } = useAuthenticator((context) => [context.user]);
  
  if (!user) {
    return <div>Please sign in to access this feature</div>;
  }
  
  return <div>Welcome, {user.signInDetails?.loginId}!</div>;
}
```

## Production Deployment

### Update Callback URLs

Before deploying to production, update the callback URLs in `terraform/variables.tf`:

```terraform
variable "cognito_callback_urls" {
  default = [
    "http://localhost:5173",
    "https://your-domain.com"  # Add your production URL
  ]
}

variable "cognito_logout_urls" {
  default = [
    "http://localhost:5173",
    "https://your-domain.com"  # Add your production URL
  ]
}
```

Run `terraform apply` to update.

### Update Environment Variables

Update `.env` with production values:
```bash
VITE_COGNITO_REDIRECT_SIGN_IN=https://your-domain.com
VITE_COGNITO_REDIRECT_SIGN_OUT=https://your-domain.com
VITE_API_ENDPOINT=https://api.your-domain.com/api
```

## Troubleshooting

### "No token provided" error
- Check that `amplify-config.ts` is imported in `App.tsx`
- Verify environment variables are set correctly
- Make sure you're using `authenticatedFetch` for API calls

### "Invalid or expired token" error
- Token may have expired (60 min validity)
- Sign out and sign in again
- Check that backend `COGNITO_USER_POOL_ID` matches frontend

### Email verification not working
- Check spam folder
- Verify email configuration in Cognito User Pool
- For production, configure SES for email sending

### User can't sign in
- Verify user exists in Cognito (AWS Console > Cognito > Users)
- Check if email is verified
- Ensure password meets policy requirements

### OAuth providers not working
- Verify client IDs and secrets are correct
- Check callback URLs match provider configuration
- Ensure provider is added to Cognito User Pool

## Security Best Practices

1. **Never commit credentials** - Use .env files and .gitignore
2. **Use HTTPS in production** - Cognito requires HTTPS for OAuth
3. **Rotate secrets regularly** - Update OAuth credentials periodically
4. **Enable MFA** - Can be enforced in Cognito User Pool settings
5. **Monitor logs** - Check CloudWatch for authentication failures
6. **Set appropriate token validity** - Balance security and UX
7. **Use secure password policy** - Already configured in terraform

## Next Steps

- [ ] Deploy Cognito with Terraform
- [ ] Configure environment variables
- [ ] Test authentication flow
- [ ] Protect additional routes as needed
- [ ] Add backend endpoints for blog/voting with auth
- [ ] Configure OAuth providers (optional)
- [ ] Set up production environment
- [ ] Enable MFA (optional)
