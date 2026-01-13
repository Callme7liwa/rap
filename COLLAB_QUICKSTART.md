# 🚀 Quick Start: Collaboration Request System

## Start Using in 3 Steps

### Step 1: Start the Backend ✅
```bash
cd backend-api
npm start
```
Server runs on: `http://localhost:8089`

### Step 2: Start the Frontend ✅
```bash
# In a new terminal
npm run dev
```
App runs on: `http://localhost:5173`

### Step 3: Test the Feature ✅

#### As a Fan:
1. **Login** to your account
2. **Navigate** to any artist page (e.g., `/artists/57386`)
3. **Click** the **"Request Collab"** button (next to Follow button)
4. **Fill out** the form:
   - Select collaboration type (Song or Album)
   - Write your message (up to 500 characters)
   - Click "Send Request"
5. **View** your requests at `/my-collab-requests` (from user menu)

#### As an Artist:
1. **Login** with an artist-associated account
   - Your user must have an entry in `lyricscape-artist-users-prod` table
   - Format: `{ artist_id: 123, user_id: "your-cognito-id" }`
2. **Navigate** to `/collab-requests` (from user menu → "Artist Requests")
3. **View** pending requests
4. **Click** "Approve" or "Reject"
5. **Add** an optional response message
6. **Confirm** your response

---

## 🎯 Quick Testing Checklist

### Test Rate Limiting:
- [ ] Send 1st request → Should succeed
- [ ] Send 2nd request → Should succeed
- [ ] Try 3rd request → Should fail with "Monthly limit reached"
- [ ] Check reset date → Should show 1st of next month

### Test Request Flow:
- [ ] Create request as fan
- [ ] View request in `/my-collab-requests`
- [ ] Login as artist
- [ ] View request in `/collab-requests`
- [ ] Approve request with message
- [ ] Check fan sees response

### Test Access Control:
- [ ] Try viewing another user's requests → Should fail
- [ ] Try responding to non-owned artist's requests → Should fail
- [ ] Artist cannot request collab with themselves → Button hidden

---

## 📍 Key URLs

- **My Requests**: `http://localhost:5173/my-collab-requests`
- **Artist Dashboard**: `http://localhost:5173/collab-requests`
- **Artist Page Example**: `http://localhost:5173/artists/57386`

---

## 🎨 UI Features to Test

### Request Button:
- ✅ Appears on all artist pages
- ✅ Hidden if viewing your own artist page
- ✅ Opens beautiful dialog with form
- ✅ Shows monthly limit info

### Artist Dashboard:
- ✅ Summary cards with counts
- ✅ Tabbed interface (Pending, Approved, Rejected, Completed)
- ✅ Badge indicators on tabs
- ✅ Approve/Reject buttons
- ✅ Response dialog

### My Requests Page:
- ✅ Monthly limit card (used/remaining/reset)
- ✅ All requests with status badges
- ✅ Color-coded statuses
- ✅ Empty state with "Browse Artists" button

---

## 🔧 Troubleshooting

### "You are not associated with any artist profile"
**Solution:** Add entry to `lyricscape-artist-users-prod` table:
```javascript
{
  artist_id: 123,           // Artist ID
  user_id: "cognito-uuid",  // Your Cognito user ID
  created_at: Date.now()
}
```

### "Monthly limit reached"
**Expected:** Users can only make 2 requests per month
**Resets:** Automatically on 1st of next month
**Bypass:** Cannot be bypassed (except by admins)

### Requests not showing
**Check:**
1. DynamoDB table exists: `lyricscape-collab-requests-prod`
2. AWS credentials are configured
3. Backend server is running on port 8089
4. Browser console for API errors

---

## 📊 Rate Limit Details

- **Limit**: 2 requests per user per month
- **Reset**: 1st of each month at 00:00:00
- **Tracking**: By `requester_id` (Cognito user ID)
- **Scope**: All requests (pending, approved, rejected, cancelled) count
- **Check**: GET `/api/collab-requests/limit-check`

---

## 🎯 Next Steps

Once tested, you can:
1. Add email notifications (when artist responds)
2. Add push notifications (real-time updates)
3. Increase limit for premium users
4. Add direct messaging between fan and artist
5. Add file attachments to requests
6. Track analytics (acceptance rates, popular artists)

---

## 📚 Full Documentation

See `COLLABORATION_REQUESTS_FEATURE.md` for:
- Complete API documentation
- Database schema details
- All endpoint examples
- Security implementation
- Future enhancement ideas

---

## ✅ System Status

- [x] DynamoDB table created and active
- [x] Backend API routes registered
- [x] Frontend components complete
- [x] Navigation links added
- [x] Routes configured
- [x] Rate limiting active
- [x] Security implemented
- [x] Documentation complete

**Status:** 🟢 **READY TO USE**

---

**Happy Collaborating!** 🎵🤝
