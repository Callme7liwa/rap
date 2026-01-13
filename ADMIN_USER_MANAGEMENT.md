# Admin User Management

## Overview
Complete user management system allowing admins to promote or demote other users to/from admin status.

## Features

### Frontend Page (`/admin/user-management`)
- **User List Display**: Shows all Cognito users with their details
- **Search Functionality**: Filter users by username or email
- **Statistics Dashboard**: 
  - Total Users count
  - Admin Users count
  - Regular Users count
- **User Details Table**:
  - Username
  - Email
  - Status (Active/Disabled)
  - Role (Admin/User badge)
  - Created date
  - Action buttons

### Admin Actions
1. **Make Admin**: Promote regular user to admin
2. **Remove Admin**: Demote admin to regular user
3. **Confirmation Dialog**: Prevents accidental changes
4. **Self-Protection**: Admins cannot remove themselves

## Backend API

### 1. GET /api/admin/users
**Description**: Fetch all Cognito users with their groups

**Authentication**: Required (Admin only)

**Response**:
```json
{
  "users": [
    {
      "username": "john_doe",
      "email": "john@example.com",
      "enabled": true,
      "userStatus": "CONFIRMED",
      "groups": ["admin"],
      "createdAt": "2024-01-15T10:30:00.000Z",
      "lastModified": "2024-01-15T10:30:00.000Z"
    }
  ],
  "total": 50,
  "admins": 3,
  "regularUsers": 47
}
```

**Features**:
- Fetches all users from Cognito User Pool
- Gets group memberships for each user
- Sorts users (admins first, then alphabetically)
- Returns comprehensive statistics

### 2. POST /api/admin/users/:username/add-to-admin
**Description**: Add user to admin group

**Authentication**: Required (Admin only)

**URL Parameters**:
- `username` (string): Cognito username

**Response Success**:
```json
{
  "success": true,
  "message": "User john_doe has been added to admin group",
  "username": "john_doe",
  "group": "admin"
}
```

**Error Responses**:
- `404 USER_NOT_FOUND`: User doesn't exist
- `400 ALREADY_ADMIN`: User is already an admin
- `500 ADD_ADMIN_ERROR`: Failed to add user to admin group

**Validation**:
- Verifies user exists in Cognito
- Checks if user is already admin
- Prevents duplicate admin group membership

### 3. POST /api/admin/users/:username/remove-from-admin
**Description**: Remove user from admin group

**Authentication**: Required (Admin only)

**URL Parameters**:
- `username` (string): Cognito username

**Response Success**:
```json
{
  "success": true,
  "message": "User john_doe has been removed from admin group",
  "username": "john_doe",
  "group": "admin"
}
```

**Error Responses**:
- `404 USER_NOT_FOUND`: User doesn't exist
- `400 NOT_ADMIN`: User is not an admin
- `400 CANNOT_REMOVE_SELF`: Admin cannot remove themselves
- `500 REMOVE_ADMIN_ERROR`: Failed to remove user from admin group

**Security**:
- Prevents self-demotion (admin removing themselves)
- Verifies user is actually an admin before removal
- Validates user existence

## UI Components

### AdminUserManagement Page
**Location**: `src/pages/AdminUserManagement.tsx`

**Key Features**:
1. **Statistics Cards**:
   - Total Users with Users icon
   - Admin Users with Shield icon (primary color)
   - Regular Users with Users icon

2. **Search Bar**:
   - Real-time filtering
   - Search by username or email
   - Search icon indicator

3. **Users Table**:
   - Username column
   - Email column
   - Status badge (Active/Disabled with icons)
   - Role badge (Admin with Shield/User)
   - Created date
   - Action buttons (Make Admin/Remove Admin)

4. **Confirmation Dialog**:
   - Clear action description
   - Lists permissions being granted/revoked
   - Cancel/Confirm buttons
   - Loading states during operations

5. **Toast Notifications**:
   - Success: "Admin Added" / "Admin Removed"
   - Error: Specific error messages with details
   - Automatic dismissal

### Navigation Integration
**Location**: `src/components/Navigation.tsx`

**Menu Item**:
- Icon: `UserCog` (lucide-react)
- Label: "User Management"
- Route: `/admin/user-management`
- Visibility: Admin users only
- Position: Second item in Admin section

## Security

### Backend Protection
1. **Route Protection**: All endpoints use `verifyToken` + `requireAdmin` middleware
2. **Self-Protection**: Admins cannot remove their own admin status
3. **Validation**: Comprehensive checks before Cognito operations
4. **Error Handling**: Clear error codes and messages
5. **Logging**: All operations logged with username and action

### Frontend Protection
1. **AdminRoute**: Wrapper component checks authentication and admin status
2. **Confirmation Dialog**: Prevents accidental changes
3. **Loading States**: Disables buttons during operations
4. **Error Display**: Toast notifications for all errors

## AWS Cognito Integration

### Required Cognito Commands
The backend uses these AWS SDK Cognito commands:
1. `ListUsersCommand`: Fetch all users from User Pool
2. `AdminListGroupsForUserCommand`: Get user's group memberships
3. `AdminGetUserCommand`: Verify user exists
4. `AdminAddUserToGroupCommand`: Add user to admin group
5. `AdminRemoveUserFromGroupCommand`: Remove user from admin group

### Environment Variables
```env
COGNITO_USER_POOL_ID=your-user-pool-id
AWS_REGION=eu-north-1
```

## Usage Flow

### Admin Promotion Flow
1. Admin opens User Management page
2. Searches for user (optional)
3. Clicks "Make Admin" button
4. Reviews confirmation dialog showing:
   - User being promoted
   - List of permissions being granted
5. Clicks "Grant Admin Access"
6. Backend validates user exists
7. Backend checks not already admin
8. Backend adds user to admin group
9. Success toast appears
10. User list refreshes with updated role

### Admin Demotion Flow
1. Admin opens User Management page
2. Finds admin user in list
3. Clicks "Remove Admin" button
4. Reviews confirmation dialog showing:
   - User being demoted
   - Warning about losing access
5. Clicks "Remove Admin Access"
6. Backend validates user exists
7. Backend checks is actually admin
8. Backend prevents self-removal
9. Backend removes user from admin group
10. Success toast appears
11. User list refreshes with updated role

## Testing

### Manual Testing Steps

#### Test Admin Promotion
```bash
# 1. Login as admin
# 2. Navigate to /admin/user-management
# 3. Search for regular user
# 4. Click "Make Admin"
# 5. Confirm action
# 6. Verify success toast
# 7. Verify user shows Admin badge
# 8. Verify button changes to "Remove Admin"
```

#### Test Admin Demotion
```bash
# 1. Login as admin
# 2. Navigate to /admin/user-management
# 3. Find admin user (not yourself)
# 4. Click "Remove Admin"
# 5. Confirm action
# 6. Verify success toast
# 7. Verify user shows User badge
# 8. Verify button changes to "Make Admin"
```

#### Test Self-Protection
```bash
# 1. Login as admin
# 2. Navigate to /admin/user-management
# 3. Find yourself in the list
# 4. Click "Remove Admin"
# 5. Confirm action
# 6. Verify error toast: "You cannot remove yourself from the admin group"
# 7. Verify your admin status unchanged
```

#### Test Search Functionality
```bash
# 1. Navigate to /admin/user-management
# 2. Type username in search box
# 3. Verify filtered results
# 4. Type email in search box
# 5. Verify filtered results
# 6. Clear search box
# 7. Verify all users shown
```

### API Testing with curl

#### Get All Users
```bash
curl -X GET http://localhost:3000/api/admin/users \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

#### Add User to Admin
```bash
curl -X POST http://localhost:3000/api/admin/users/john_doe/add-to-admin \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

#### Remove User from Admin
```bash
curl -X POST http://localhost:3000/api/admin/users/john_doe/remove-from-admin \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json"
```

## Error Handling

### Frontend Errors
- Network errors: "Failed to fetch users" or "Failed to add/remove admin"
- Authentication errors: Redirect to login
- Authorization errors: Show "Admin Access Required"
- Loading states: Spinner with disabled buttons

### Backend Errors
All errors include:
- `error`: Human-readable message
- `code`: Error code for programmatic handling
- `details` (dev mode only): Stack trace and detailed info

### Common Error Scenarios
1. **User Not Found**: Attempting to modify non-existent user
2. **Already Admin**: Trying to promote an existing admin
3. **Not Admin**: Trying to demote a regular user
4. **Self-Removal**: Admin trying to remove their own admin status
5. **Permission Denied**: Non-admin trying to access endpoints
6. **Token Invalid**: Expired or invalid authentication token

## Statistics

### Dashboard Metrics
The page displays three key metrics:
1. **Total Users**: All users in Cognito User Pool
2. **Admin Users**: Users with admin group membership
3. **Regular Users**: Users without admin group membership

Formula: `Regular Users = Total Users - Admin Users`

## Best Practices

### For Admins
1. **Verify User Identity**: Confirm correct username before promoting
2. **Review Permissions**: Understand what admin access grants
3. **Document Changes**: Keep track of who was promoted and why
4. **Regular Audits**: Periodically review admin user list
5. **Principle of Least Privilege**: Only promote when necessary

### For Developers
1. **Test Thoroughly**: Test all scenarios including edge cases
2. **Monitor Logs**: Check backend logs for suspicious activity
3. **Handle Errors Gracefully**: Clear error messages for users
4. **Validate Input**: Never trust client-side validation alone
5. **Audit Trail**: Log all admin privilege changes

## Troubleshooting

### Issue: Cannot see User Management menu
**Solution**: Verify you're logged in as admin user

### Issue: "Admin Access Required" error
**Solution**: Your user account needs admin group membership in Cognito

### Issue: Users not loading
**Solution**: 
1. Check COGNITO_USER_POOL_ID environment variable
2. Verify AWS credentials have Cognito permissions
3. Check backend logs for errors

### Issue: "Cannot remove yourself" error when removing other user
**Solution**: Backend might be incorrectly identifying current user. Check JWT token parsing.

### Issue: Changes not reflecting immediately
**Solution**: React Query cache might be stale. Refresh the page or check cache invalidation.

## Future Enhancements

### Potential Features
1. **Bulk Operations**: Promote/demote multiple users at once
2. **User Groups Management**: Create and manage custom groups
3. **Role-Based Access Control**: More granular permissions
4. **Activity Logs**: Track all admin actions with timestamps
5. **Email Notifications**: Notify users when promoted/demoted
6. **User Permissions Matrix**: Visual display of all permissions
7. **Export Functionality**: Export user list to CSV/Excel
8. **Advanced Filters**: Filter by status, group, date range
9. **User Statistics**: Login frequency, activity metrics
10. **Temporary Admin Access**: Set expiration for admin status

## Related Documentation
- [ADMIN_SECURITY.md](./ADMIN_SECURITY.md) - Admin access control
- [SECURITY_ENHANCED.md](./SECURITY_ENHANCED.md) - Security implementation
- [AUTHENTICATION_SETUP.md](./AUTHENTICATION_SETUP.md) - Cognito setup

## Summary
Complete admin user management system with secure promotion/demotion capabilities, comprehensive validation, intuitive UI, and robust error handling. Ready for production use with proper security measures in place.
