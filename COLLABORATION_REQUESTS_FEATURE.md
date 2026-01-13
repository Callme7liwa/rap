# Collaboration Request System

## Overview

The Collaboration Request System allows fans to request collaborations with artists. Artists receive these requests in a dedicated dashboard and can approve, reject, or mark them as completed.

## Features

### For Fans/Users
- **Request Collaborations**: Send collaboration requests to any artist
- **Rate Limiting**: 2 requests per user per month
- **Request Types**: 
  - Song Collaboration
  - Album Collaboration
- **Track Requests**: View all your sent requests and their status
- **Monthly Reset**: Request limit resets on the 1st of each month

### For Artists
- **Request Dashboard**: View all collaboration requests
- **Organized by Status**: 
  - Pending (requires action)
  - Approved (in progress)
  - Rejected (declined)
  - Completed (finished collaborations)
- **Respond to Requests**: Approve or reject with optional messages
- **Mark as Completed**: Update status when collaboration is done

## Database Schema

### Table: `lyricscape-collab-requests-prod`

**Primary Key:**
- `id` (Number) - Unique request ID

**Global Secondary Indexes:**
1. `artist_id-status-index` - For artists to query their requests by status
2. `requester_id-created_at-index` - For users to query their requests chronologically

**Fields:**
```javascript
{
  id: Number,                      // Unique request ID
  requester_id: String,            // Cognito user ID
  requester_name: String,          // Display name
  requester_email: String,         // Contact email
  artist_id: Number,               // Target artist ID
  artist_name: String,             // Target artist name
  collaboration_type: String,      // 'song' | 'album'
  message: String,                 // Request message (max 500 chars)
  status: String,                  // 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled'
  created_at: Number,              // Timestamp (milliseconds)
  updated_at: Number,              // Timestamp (milliseconds)
  responded_at: Number,            // Timestamp when artist responded (optional)
  response_message: String         // Artist's response (optional)
}
```

## API Endpoints

### User Endpoints

#### POST `/api/collab-requests`
Create a new collaboration request.

**Authentication:** Required  
**Body:**
```json
{
  "artist_id": 123,
  "collaboration_type": "song",
  "message": "I'd love to collaborate on a track..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Collaboration request submitted successfully",
  "request": { /* request object */ },
  "remaining": 1
}
```

**Errors:**
- `400` - Missing fields or invalid data
- `429` - Monthly limit reached
- `404` - Artist not found

#### GET `/api/collab-requests/my-requests`
Get user's own collaboration requests.

**Authentication:** Required  
**Response:**
```json
{
  "requests": [ /* array of requests */ ],
  "limit": {
    "count": 2,
    "limit": 2,
    "remaining": 0,
    "canRequest": false,
    "resetDate": "2025-12-01T00:00:00.000Z"
  }
}
```

#### GET `/api/collab-requests/limit-check`
Check monthly request limit.

**Authentication:** Required  
**Response:**
```json
{
  "count": 2,
  "limit": 2,
  "remaining": 0,
  "canRequest": false,
  "resetDate": "2025-12-01T00:00:00.000Z"
}
```

#### DELETE `/api/collab-requests/:id`
Cancel a pending request (requester only).

**Authentication:** Required  
**Response:**
```json
{
  "success": true,
  "message": "Request cancelled successfully"
}
```

### Artist Endpoints

#### GET `/api/collab-requests/for-artist`
Get all requests for owned artist.

**Authentication:** Required (must be associated with an artist)  
**Response:**
```json
{
  "requests": [ /* all requests */ ],
  "grouped": {
    "pending": [ /* pending requests */ ],
    "approved": [ /* approved requests */ ],
    "rejected": [ /* rejected requests */ ],
    "completed": [ /* completed requests */ ]
  },
  "counts": {
    "total": 10,
    "pending": 3,
    "approved": 2,
    "rejected": 4,
    "completed": 1
  }
}
```

#### PUT `/api/collab-requests/:id/respond`
Respond to a collaboration request.

**Authentication:** Required (must own the artist)  
**Body:**
```json
{
  "status": "approved",
  "response_message": "Let's do this! Here's my email..."
}
```

**Status Options:**
- `approved` - Accept the collaboration
- `rejected` - Decline the collaboration
- `completed` - Mark as finished

**Response:**
```json
{
  "success": true,
  "message": "Response submitted successfully",
  "request": { /* updated request */ }
}
```

### Common Endpoint

#### GET `/api/collab-requests/:id`
Get a single request by ID.

**Authentication:** Required (must be requester or artist)  
**Response:** Request object

## Frontend Components

### Components

#### `RequestCollabForm.tsx`
Form for creating collaboration requests.
- Collaboration type selector (song/album)
- Message textarea (500 char limit)
- Monthly limit display
- Validation and error handling

#### `CollabRequestCard.tsx`
Display card for collaboration requests.
- Shows request details and status
- Different views for artists vs requesters
- Action buttons (approve/reject/complete)
- Response dialog

### Pages

#### `MyCollabRequestsPage.tsx`
User's sent requests page.
- Monthly limit info card
- List of all sent requests
- Status tracking

#### `ArtistCollabRequestsPage.tsx`
Artist's received requests dashboard.
- Summary cards (pending/approved/rejected/completed)
- Tabbed interface by status
- Request management

### Routes
- `/my-collab-requests` - View your sent requests
- `/collab-requests` - View requests for your artist (requires artist association)

## Setup Instructions

### 1. Create DynamoDB Table

Run the setup script:
```bash
cd backend-api
node scripts/setup-collab-requests-table.js
```

This will create the `lyricscape-collab-requests-prod` table with the correct schema and indexes.

### 2. Backend Already Configured

The route is already registered in `server.js`:
```javascript
app.use('/api/collab-requests', collabRequestsRouter);
```

### 3. Frontend Already Configured

Routes are registered in `App.tsx`:
```tsx
<Route path="/my-collab-requests" element={<ProtectedRoute><MyCollabRequestsPage /></ProtectedRoute>} />
<Route path="/collab-requests" element={<ProtectedRoute><ArtistCollabRequestsPage /></ProtectedRoute>} />
```

Navigation menu includes:
- "My Collab Requests" - For all users
- "Artist Requests" - For users with artist associations

### 4. Test the System

1. **As a Fan:**
   - Navigate to any artist page
   - Click "Request Collab" button
   - Fill out the form and submit
   - View your requests at `/my-collab-requests`

2. **As an Artist:**
   - Ensure you're associated with an artist (via `lyricscape-artist-users-prod` table)
   - Navigate to `/collab-requests`
   - View and respond to pending requests

## Rate Limiting Logic

The system enforces **2 requests per user per month**:

1. Month starts on the 1st at 00:00:00
2. Each request counts toward the limit
3. Limit resets automatically on the 1st of next month
4. Users see their remaining requests in real-time
5. API returns 429 error when limit is reached

## Middleware

### `verifyToken`
Validates JWT token and extracts user information.

### `checkArtistPermissions`
Verifies user is associated with an artist (for artist-only endpoints).

## Access Control

### User Requests
- Users can only view/cancel their own requests
- Users cannot exceed 2 requests per month
- Cancelled requests still count toward monthly limit

### Artist Requests
- Artists can only view/respond to requests for their artist profile
- Artists cannot create requests for themselves
- Admins can view/respond to any request

## Status Flow

```
pending → approved → completed
       ↘ rejected
       ↘ cancelled (by user)
```

- **pending**: Initial state, requires artist action
- **approved**: Artist accepted, collaboration can proceed
- **rejected**: Artist declined
- **completed**: Collaboration finished (artist marks as done)
- **cancelled**: User cancelled before artist responded

## UI Features

### Request Button
- Appears on artist detail pages
- Hidden for artists viewing their own page
- Opens dialog with request form

### Navigation Links
- "My Collab Requests" - Always visible to logged-in users
- "Artist Requests" - Visible to users with artist associations

### Real-time Updates
- Request counts update after actions
- Status changes reflect immediately
- Monthly limit updates in real-time

## Notifications (Future Enhancement)

Currently, the system tracks requests in the database. Future enhancements could include:
- Email notifications when artist responds
- Push notifications for new requests
- In-app notification bell with unread count
- Weekly digest emails for artists

## Security

- All endpoints require authentication
- Rate limiting prevents spam
- Input validation (500 char message limit)
- Access control ensures users only see their data
- Artist ownership verification for responses

## Error Handling

The system provides clear error messages:
- **400**: Invalid input or missing fields
- **403**: Access denied (not your request/artist)
- **404**: Request or artist not found
- **429**: Monthly limit reached
- **500**: Server error

## Testing Tips

1. **Test Rate Limiting:**
   - Create 2 requests in same month
   - Try creating a 3rd (should fail with 429)
   - Verify reset date is shown correctly

2. **Test Artist Responses:**
   - Associate a user with an artist
   - Send requests to that artist
   - View in artist dashboard
   - Test approve/reject/complete actions

3. **Test Access Control:**
   - Try viewing another user's requests (should fail)
   - Try responding to requests for non-owned artist (should fail)

## Troubleshooting

### "You are not associated with any artist profile"
- User needs entry in `lyricscape-artist-users-prod` table
- Entry format: `{ artist_id: 123, user_id: "cognito-user-id" }`

### "Monthly limit reached"
- User has made 2 requests this month
- Limit resets on 1st of next month
- Cannot be bypassed (except by admins)

### Requests not showing
- Check table name is correct: `lyricscape-collab-requests-prod`
- Verify AWS credentials have DynamoDB access
- Check browser console for API errors

## Future Enhancements

1. **Notifications**: Email/push when artist responds
2. **Messaging**: Direct chat between fan and artist
3. **File Attachments**: Share demos/samples with request
4. **Request Templates**: Pre-filled messages for common collaboration types
5. **Search/Filter**: Search requests by artist/status/date
6. **Analytics**: Track request acceptance rates
7. **Premium Users**: Higher monthly limits for premium members
