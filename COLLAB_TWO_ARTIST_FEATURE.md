# Collaboration Request System - Two-Artist Feature

## Overview
The collaboration request system now supports **two types of requests**:

1. **Artist-to-Artist**: An artist requests to collaborate with another artist
2. **Fan-Requested**: A regular user requests a collaboration **between two artists**

## How It Works

### For Artists
When an artist requests a collaboration:
- They click "Request Collab" on another artist's page
- They select collaboration type (Song or Album)
- They write a message describing their vision
- **Only one artist is selected** (the one they want to collaborate with)
- The request shows as: "Artist A wants to collaborate with Artist B"

### For Regular Users (Fans)
When a regular user requests a collaboration:
- They click "Request Collab" on an artist's page (Artist A)
- They **select a second artist** from a dropdown (Artist B)
- They select collaboration type (Song or Album)
- They write a message describing why these artists should collaborate
- The request shows as: "Request for **Artist A + Artist B** collaboration"

## Database Schema

### New Fields Added
```javascript
{
  // Existing fields
  id: number,
  requester_id: string,
  requester_name: string,  // Shows artist name or display name
  requester_email: string,
  requester_is_artist: boolean,  // True if requester is an artist
  requester_artist_id: number | null,  // Artist ID if requester is artist
  artist_id: number,  // Primary artist
  artist_name: string,
  
  // NEW FIELDS
  collaborator_artist_id: number | null,  // Second artist (for fan requests)
  collaborator_artist_name: string | null,  // Second artist name
  
  collaboration_type: 'song' | 'album',
  message: string,
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled',
  created_at: number,
  updated_at: number
}
```

## UI/UX Changes

### Request Form
- **For Artists**: Shows single artist selection (the target artist)
- **For Fans**: Shows:
  1. Primary artist (the page they're on)
  2. Dropdown to select second artist
  3. Helper text: "You're requesting a collaboration between Artist A and another artist"

### Request Cards
- **Artist Requests**: Shows "Request from [Name]" with Artist badge if applicable
- **Fan Requests**: Shows "Request for **Artist A + Artist B**" in bold

### Placeholders
- **Artist placeholder**: "Describe your collaboration idea, what you bring to the table..."
- **Fan placeholder**: "Describe why these artists should collaborate, your vision for the collaboration..."

## API Changes

### POST /api/collab-requests
```javascript
// Request Body
{
  artist_id: number,  // Required: Primary artist
  collaborator_artist_id: number | null,  // Optional: Second artist (for fans)
  collaboration_type: 'song' | 'album',  // Required
  message: string  // Required
}

// Response
{
  success: true,
  message: 'Collaboration request submitted successfully',
  request: { /* full request object */ },
  remaining: number  // Requests remaining this month
}
```

### Backend Logic
1. Validates `artist_id` exists
2. If `collaborator_artist_id` provided, validates it exists
3. Gets requester display info (artist name or user display name)
4. Creates request with all fields
5. Returns success with remaining requests count

## Rate Limiting

- **Artists**: Unlimited collaboration requests
- **Fans**: 2 requests per month (resets on 1st of each month)
- Rate limit applies regardless of request type (artist-to-artist or fan-requested)

## Migration

Two migration scripts were created:

1. **migrate-request-names.js**: Updates existing requests with proper display names
2. **add-collaborator-fields.js**: Adds `collaborator_artist_id` and `collaborator_artist_name` fields (set to null for old requests)

Both scripts have been run successfully on the production database.

## Example Scenarios

### Scenario 1: Artist Collaboration
- **Raid** (artist) visits **ElGrandeToto**'s page
- Clicks "Request Collab"
- Selects "Song" and writes message
- Result: "Raid wants to collaborate with ElGrandeToto on a song"

### Scenario 2: Fan-Requested Collaboration
- **John** (fan) visits **Raid**'s page
- Clicks "Request Collab"
- Selects **ElGrandeToto** from dropdown
- Selects "Album" and writes message
- Result: "Request for **Raid + ElGrandeToto** album collaboration"

## Testing Checklist

- [x] Backend accepts `collaborator_artist_id` parameter
- [x] Backend validates both artists exist
- [x] Frontend shows artist selector for non-artists
- [x] Frontend disables submit without collaborator selection (for fans)
- [x] Request cards display "Artist A + Artist B" format
- [x] Artist badge shows correctly
- [x] Migration scripts executed successfully
- [ ] Create new request as fan (test in browser)
- [ ] Create new request as artist (test in browser)
- [ ] Verify display in artist dashboard
- [ ] Verify display in user requests page

## Files Modified

### Backend
- `backend-api/routes/collab-requests.js`: Added `collaborator_artist_id` handling
- `backend-api/add-collaborator-fields.js`: Migration script (new file)

### Frontend
- `src/components/RequestCollabForm.tsx`: Added artist selector for fans
- `src/components/CollabRequestCard.tsx`: Updated display for two-artist format
- `src/hooks/useCollabRequests.ts`: Added new fields to interfaces

### Database
- `lyricscape-collab-requests-prod`: Added 2 new nullable fields

## Next Steps

1. Test creating a collaboration request as a regular user
2. Verify the dropdown shows all artists except the current one
3. Confirm the request card shows "Artist A + Artist B" format
4. Test that artists still see the original form (no dropdown)
5. Verify both artists can see the request in their dashboard (future feature)

## Notes

- Old requests have `collaborator_artist_id: null` (backward compatible)
- The system distinguishes between artist requests and fan requests using `requester_is_artist`
- Fan-requested collaborations are sent to the primary artist (`artist_id`)
- In the future, we could notify both artists about fan-requested collaborations
