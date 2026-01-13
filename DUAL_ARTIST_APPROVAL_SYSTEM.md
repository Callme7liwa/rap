# Dual-Artist Approval System for Collaboration Requests

## Overview

This document describes the dual-artist approval system implemented for collaboration requests. When a fan submits a collaboration request involving two artists (e.g., "Raid + ElGrandeToto song collab"), both artists receive separate requests and both must approve before the collaboration is confirmed.

## Architecture

### Linked Request Pattern

When a fan creates a collaboration request between two artists:
1. **Two separate database entries** are created (one per artist)
2. Entries are **bidirectionally linked** via `linked_request_id` field
3. Each artist receives the request to their own dashboard
4. Both artists must approve for the collaboration to be finalized

### Database Structure

```javascript
// Request sent to Artist A (Raid)
{
  id: 100,
  artist_id: 57386,                    // Raid receives this request
  collaborator_artist_id: 1073333,     // ElGrandeToto is the collaborator
  collaborator_artist_name: "ElGrandeToto",
  linked_request_id: 101,              // Links to request #101
  status: 'pending',
  requester_id: 'user-uuid',
  requester_name: 'Fan Name',
  message: 'Would love to see you two collaborate!',
  collaboration_type: 'song',
  created_at: 1234567890
}

// Request sent to Artist B (ElGrandeToto)
{
  id: 101,
  artist_id: 1073333,                  // ElGrandeToto receives this request
  collaborator_artist_id: 57386,       // Raid is the collaborator
  collaborator_artist_name: "Raid",
  linked_request_id: 100,              // Links to request #100
  status: 'pending',
  requester_id: 'user-uuid',
  requester_name: 'Fan Name',
  message: 'Would love to see you two collaborate!',
  collaboration_type: 'song',
  created_at: 1234567890
}
```

## Status Flow

### New Status: `partially_approved`

This status indicates that one artist has approved the collaboration, but the other artist hasn't responded yet.

```
Initial State:
  Request A: pending    Request B: pending

Scenario 1: Artist A Approves First
  Request A: partially_approved  ← Changed by Artist A
  Request B: pending             ← Still waiting

Scenario 2: Artist B Then Approves
  Request A: approved            ← Updated to full approval
  Request B: approved            ← Updated to full approval

Scenario 3: One Artist Rejects
  Request A: rejected            ← Both marked as rejected
  Request B: rejected            ← Both marked as rejected
```

### State Machine

```
pending → partially_approved → approved
   ↓              ↓
rejected ← ─ ─ ─ ┘
```

- **pending**: Initial state, neither artist has responded
- **partially_approved**: One artist approved, waiting for the other
- **approved**: Both artists approved the collaboration
- **rejected**: One or both artists rejected the collaboration

## Implementation Details

### Backend Logic (collab-requests.js)

#### Creating Dual Requests

```javascript
// POST /api/collab-requests
if (collaborator_artist_id) {
  // Generate sequential IDs
  const requestId = await getNextId();
  const secondRequestId = requestId + 1;
  
  // Create Request 1 (for Artist A)
  const collabRequest1 = {
    id: requestId,
    artist_id: artist_id,
    collaborator_artist_id: collaborator_artist_id,
    collaborator_artist_name: collaboratorArtist.name,
    linked_request_id: secondRequestId,
    status: 'pending',
    ...commonFields
  };
  
  // Create Request 2 (for Artist B - roles reversed)
  const collabRequest2 = {
    id: secondRequestId,
    artist_id: collaborator_artist_id,
    collaborator_artist_id: artist_id,
    collaborator_artist_name: artist.name,
    linked_request_id: requestId,
    status: 'pending',
    ...commonFields
  };
  
  // Save both requests
  await dynamoClient.send(new PutCommand({ Item: collabRequest1 }));
  await dynamoClient.send(new PutCommand({ Item: collabRequest2 }));
  
  return { requests: [collabRequest1, collabRequest2] };
}
```

#### Handling Approval Responses

```javascript
// PUT /api/collab-requests/:id/respond
if (request.linked_request_id) {
  const linkedRequest = await getRequest(request.linked_request_id);
  
  if (status === 'approved') {
    if (linkedRequest.status === 'approved') {
      // BOTH APPROVED - Finalize collaboration
      await updateStatus(request.id, 'approved');
      await updateStatus(linkedRequest.id, 'approved');
      return { 
        bothApproved: true, 
        message: 'Both artists approved! Collaboration confirmed.' 
      };
    } else {
      // FIRST APPROVAL - Mark as partial
      await updateStatus(request.id, 'partially_approved');
      return { 
        waitingForOther: true, 
        message: `Approved! Waiting for ${linkedRequest.artist_name} to respond.` 
      };
    }
  } else if (status === 'rejected') {
    // ONE REJECTS - Kill both requests
    await updateStatus(request.id, 'rejected');
    await updateStatus(linkedRequest.id, 'rejected');
    return { 
      message: 'Collaboration request declined.' 
    };
  }
}
```

### Frontend Components

#### ArtistCollabRequestsPage.tsx

**Summary Cards:**
- Added 5th card for "Partially Approved" requests
- Orange/yellow theme to indicate waiting status
- Shows count of requests with `status === 'partially_approved'`

**Tab System:**
- Changed from 4 tabs to 5 tabs (`grid-cols-5`)
- New "Partial" tab shows partially approved requests
- Badge indicator shows count when > 0

```tsx
<TabsList className="grid w-full grid-cols-5">
  <TabsTrigger value="pending">Pending</TabsTrigger>
  <TabsTrigger value="partially_approved">
    Partial
    {counts.partially_approved > 0 && (
      <Badge variant="secondary">{counts.partially_approved}</Badge>
    )}
  </TabsTrigger>
  <TabsTrigger value="approved">Approved</TabsTrigger>
  <TabsTrigger value="rejected">Rejected</TabsTrigger>
  <TabsTrigger value="completed">Completed</TabsTrigger>
</TabsList>
```

#### CollabRequestCard.tsx

**Approval Status Display:**
Shows visual indicator when request is partially approved:

```tsx
{request.status === 'partially_approved' && request.collaborator_artist_name && (
  <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg border-l-4 border-orange-500">
    <div className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-orange-500" />
      <span className="font-medium">You approved this collaboration!</span>
    </div>
    <p className="mt-1 text-muted-foreground">
      Waiting for <strong>{request.collaborator_artist_name}</strong> to respond.
    </p>
  </div>
)}
```

**Collaborator Display:**
Shows which artist this request is paired with:

```tsx
{request.collaborator_artist_name && (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Users className="h-4 w-4" />
    <span>
      Collaboration with: <strong>{request.collaborator_artist_name}</strong>
    </span>
  </div>
)}
```

### TypeScript Interfaces (useCollabRequests.ts)

```typescript
export interface CollabRequest {
  id: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'partially_approved';
  linked_request_id?: number | null;  // Links to paired request
  collaborator_artist_id?: number | null;
  collaborator_artist_name?: string | null;
  approval_status?: {
    artist_1_approved: boolean;
    artist_2_approved: boolean;
    artist_1_id: number;
    artist_2_id: number;
  };
  // ... other fields
}
```

## Migration

### Adding linked_request_id to Existing Requests

Run the migration script to add the `linked_request_id` field to all existing requests:

```bash
cd backend-api
node add-linked-request-field.js
```

This script:
1. Scans all existing collaboration requests
2. Adds `linked_request_id: null` to requests that don't have it
3. Skips requests that already have the field
4. Provides a summary of updated/skipped requests

## User Experience

### Fan Perspective

1. **Creating Request:**
   - Fan selects two artists from dropdown
   - Submits collaboration request with message
   - Sees confirmation: "Requests sent to both artists!"

2. **Viewing Status:**
   - Status shows "Pending" initially
   - Updates to "Partially Approved" when one artist responds
   - Updates to "Approved" when both artists approve
   - Updates to "Rejected" if either artist rejects

### Artist Perspective

1. **Receiving Request:**
   - Artist sees new request in "Pending" tab
   - Request card shows: "Collaboration with: [Other Artist Name]"
   - Fan's message explains the collaboration idea

2. **Approving Request:**
   - Artist clicks "Approve" button
   - If first to approve:
     - Status changes to "Partially Approved"
     - Card shows: "You approved! Waiting for [Other Artist] to respond."
     - Request moves to "Partial" tab
   - If second to approve:
     - Status changes to "Approved"
     - Both artists see: "Both artists approved! Collaboration confirmed."
     - Request moves to "Approved" tab

3. **Rejecting Request:**
   - Artist clicks "Reject" button
   - Both linked requests immediately become "Rejected"
   - Other artist sees rejection in their dashboard
   - Both requests move to "Rejected" tab

## Example Flow

### Complete Approval Scenario

```
Time 0: Fan creates request "Raid + ElGrandeToto song collab"
  → System creates Request #100 for Raid
  → System creates Request #101 for ElGrandeToto
  → Both requests linked via linked_request_id

Time 1: Raid logs in and sees Request #100 in "Pending" tab
  → Raid clicks "Approve"
  → Request #100 status: pending → partially_approved
  → Request #100 moves to "Partial" tab
  → Shows: "You approved! Waiting for ElGrandeToto to respond."

Time 2: ElGrandeToto logs in and sees Request #101 in "Pending" tab
  → ElGrandeToto clicks "Approve"
  → Request #101 status: pending → approved
  → Request #100 status: partially_approved → approved
  → Both requests move to "Approved" tab
  → Both artists see: "Both artists approved! Collaboration confirmed."

Time 3: Artists coordinate on collaboration details
  → Artists can mark request as "Completed" when done
```

### Rejection Scenario

```
Time 0: Fan creates request "Raid + ElGrandeToto song collab"
  → System creates Request #100 for Raid
  → System creates Request #101 for ElGrandeToto

Time 1: Raid logs in and approves Request #100
  → Request #100 status: pending → partially_approved

Time 2: ElGrandeToto logs in and rejects Request #101
  → Request #101 status: pending → rejected
  → Request #100 status: partially_approved → rejected (automatically)
  → Both requests move to "Rejected" tab
  → Raid sees: "Collaboration request declined."
```

## Testing Checklist

- [x] Create dual requests for fan-requested collaborations
- [x] Verify both artists receive separate requests
- [ ] Test first approval (should become partially_approved)
- [ ] Test second approval (both should become approved)
- [ ] Test rejection by first artist (both should become rejected)
- [ ] Test rejection by second artist (both should become rejected)
- [ ] Verify UI shows correct status in each tab
- [ ] Verify approval status message displays correctly
- [ ] Verify collaborator name displays correctly
- [ ] Run migration script on existing requests
- [ ] Test with actual user accounts and artist profiles

## Technical Notes

### ID Generation

Sequential IDs are generated using `getNextId()` function:
```javascript
const requestId = await getNextId();      // e.g., 100
const secondRequestId = requestId + 1;    // 101
```

This ensures linked requests have consecutive IDs and prevents ID collisions.

### Database Queries

When querying for artist requests, both:
- Requests where `artist_id = current_artist_id` (primary requests)
- Requests where `collaborator_artist_id = current_artist_id` (collaborative requests)

Should be fetched. Currently only primary requests are shown.

### Future Enhancements

1. **Notification System**: Alert artists when their collaborator approves
2. **Expiration**: Auto-reject requests after X days of partial approval
3. **Timeline View**: Show approval history (who approved when)
4. **Comments**: Allow artists to discuss before approving
5. **Counter-Offers**: Allow artists to suggest modifications

## Files Modified

### Backend
- `backend-api/routes/collab-requests.js`
  - POST endpoint: Create dual linked requests
  - PUT respond endpoint: Handle partial approval logic
  - GET for-artist endpoint: Include partially_approved in counts

### Frontend
- `src/hooks/useCollabRequests.ts`
  - Added `partially_approved` status to type definitions
  - Added `linked_request_id` field to interface
  - Updated `useArtistCollabRequests` return type

- `src/pages/ArtistCollabRequestsPage.tsx`
  - Added 5th summary card for partially approved
  - Changed grid from `grid-cols-4` to `grid-cols-5`
  - Added 5th tab "Partial" to TabsList
  - Added TabsContent for partially_approved requests

- `src/components/CollabRequestCard.tsx`
  - Added approval status display for partially approved requests
  - Shows "You approved! Waiting for [Artist]" message
  - Orange-themed status box with clock icon

### Migration
- `backend-api/add-linked-request-field.js`
  - Adds `linked_request_id: null` to existing requests
  - Prevents errors when querying old requests

## Deployment Steps

1. **Update Backend:**
   ```bash
   cd backend-api
   npm install  # If any new dependencies
   ```

2. **Run Migration:**
   ```bash
   node add-linked-request-field.js
   ```

3. **Restart Backend Server:**
   ```bash
   npm run dev
   ```

4. **Update Frontend:**
   ```bash
   cd ..
   npm install  # If any new dependencies
   npm run dev
   ```

5. **Test Complete Flow:**
   - Create fan account
   - Create collaboration request with 2 artists
   - Login as Artist A, approve request
   - Login as Artist B, approve request
   - Verify both see "approved" status

## Support

For issues or questions about the dual-artist approval system:
1. Check this documentation
2. Review the TypeScript interfaces in `useCollabRequests.ts`
3. Debug using browser DevTools and backend logs
4. Check DynamoDB tables for request states

---

**Last Updated:** 2025-01-XX  
**Version:** 1.0.0  
**Status:** ✅ Implemented and Ready for Testing
