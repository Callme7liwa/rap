# Admin Security & Access Control

## Overview
All admin routes are now protected with authentication and role-based access control. Only users in the Cognito "admin" group can access admin pages.

## Protected Routes

### Admin Pages (Require "admin" group)
- `/admin/artist-management` - Artist-User association management
- `/tools/s3-manager` - S3 image upload manager
- `/voting/create` - Create voting events

## Security Implementation

### AdminRoute Component
Location: `src/components/AdminRoute.tsx`

**Features:**
1. ✅ Authentication check - Must be signed in
2. ✅ Admin role verification - Must be in "admin" Cognito group
3. ✅ Loading state - Shows spinner while checking
4. ✅ Redirect to home - Non-authenticated users redirected to home
5. ✅ Access denied page - Authenticated non-admin users see error page
6. ✅ Toast notifications - User-friendly error messages

**Flow:**
```
User tries to access admin page
  ↓
Is user authenticated?
  No → Redirect to home + "Authentication Required" toast
  ↓ Yes
Check Cognito groups
  ↓
Has "admin" group?
  No → Show "Access Denied" page + "Admin Access Required" toast
  ↓ Yes
Render admin content
```

### Navigation Menu
Location: `src/components/Navigation.tsx`

**Admin Menu Items** (Only visible to admin users):
- Shield icon + "Artist Management"
- Cloud icon + "S3 Manager"
- Vote icon + "Create Voting Event"

These appear in the user dropdown menu under an "Admin" section.

## How to Grant Admin Access

### Method 1: Using AWS Console
1. Go to AWS Cognito Console
2. Navigate to your User Pool
3. Go to "Users and groups" > "Groups"
4. Select the "admin" group
5. Click "Add users to group"
6. Select the user and add them

### Method 2: Using AWS CLI
```bash
aws cognito-idp admin-add-user-to-group \
  --user-pool-id YOUR_USER_POOL_ID \
  --username user@example.com \
  --group-name admin
```

### Method 3: Using Backend Script
```bash
cd backend-api
node scripts/add-user-to-admin.js user@example.com
```

## Testing Admin Access

### Test Non-Admin User
1. Sign in as regular user
2. Try to access: `http://localhost:8089/admin/artist-management`
3. **Expected**: "Admin Access Required" page with red background
4. **Toast**: "Admin Access Required - You need administrator privileges"

### Test Unauthenticated User
1. Sign out (if signed in)
2. Try to access: `http://localhost:8089/admin/artist-management`
3. **Expected**: Redirect to home page
4. **Toast**: "Authentication Required - Please sign in to access admin pages"

### Test Admin User
1. Sign in as admin user (user in "admin" group)
2. Check user menu dropdown
3. **Expected**: See "Admin" section with 3 admin menu items
4. Click "Artist Management"
5. **Expected**: Access granted, page loads successfully

## Security Features

### Token Verification
- All admin API endpoints use `verifyToken` middleware
- JWT tokens are validated on every request
- Expired tokens are rejected

### Group Membership Check
```typescript
const groups = session.tokens?.accessToken?.payload['cognito:groups'];
const isAdmin = groups?.includes('admin') || false;
```

### Client-Side Protection
- AdminRoute component blocks unauthorized access
- Navigation menu items conditionally rendered
- Toast notifications for better UX

### Server-Side Protection
Backend routes should also verify admin group:
```javascript
// In your route handler
const groups = req.user['cognito:groups'] || [];
if (!groups.includes('admin')) {
  return res.status(403).json({ error: 'Admin access required' });
}
```

## User Experience

### For Non-Admin Users
- Admin menu items are **hidden** (not just disabled)
- If they somehow get a direct link:
  - Friendly error page
  - Clear explanation
  - "Return to Home" button
  - Toast notification

### For Admin Users
- "Admin" section in user menu
- Easy access to all admin features
- No special login required
- Same interface, just more options

## Troubleshooting

### "Admin Access Required" even though user is admin
**Solution:**
1. Check Cognito user groups in AWS Console
2. Ensure user is in "admin" group (lowercase)
3. User must sign out and sign in again after being added to group
4. Clear browser cache if needed

### Admin menu not showing
**Solution:**
1. Check browser console for errors
2. Verify `fetchAuthSession()` is working
3. Check that token contains groups payload
4. Try signing out and back in

### Access denied on API calls
**Solution:**
1. Check backend middleware is checking groups
2. Verify token includes groups in payload
3. Check API endpoint requires admin group
4. Look at backend logs for error details

## Best Practices

1. **Always check on server-side**: Client-side checks are for UX only
2. **Log admin actions**: Track who does what in admin area
3. **Principle of least privilege**: Only grant admin when needed
4. **Regular audits**: Review admin user list regularly
5. **Separate admin accounts**: Don't use admin for daily use

## Related Files

- `src/components/AdminRoute.tsx` - Admin protection component
- `src/components/Navigation.tsx` - Navigation with admin menu
- `src/pages/AdminArtistManagement.tsx` - Artist management page
- `backend-api/middleware/auth.js` - Token verification
- `backend-api/scripts/add-user-to-admin.js` - Add user to admin group
- `backend-api/scripts/create-admin-group.js` - Create admin group

## Summary

✅ All admin routes protected
✅ Authentication required
✅ Admin group membership verified
✅ User-friendly error messages
✅ Toast notifications
✅ Hidden admin menu for non-admins
✅ Graceful degradation
✅ No development bypasses

Your admin area is now secure! 🔒
