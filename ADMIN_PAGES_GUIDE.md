# 📝 Admin Content Management Pages

## Overview

Three new admin pages have been created to manage content for the LyricScape application:
- **Add Artist** - Create new artist profiles
- **Add Album** - Add new album entries
- **Add Song** - Create new song entries with lyrics

All pages are **protected routes** requiring authentication.

---

## 🎨 Pages Created

### 1. Add Artist (`/artists/add`)
**File:** `src/pages/AddArtist.tsx`

**Features:**
- Artist name (required)
- Genre (required)
- Country (required)
- Biography (optional)
- Profile image upload with preview
- Form validation
- Glass morphism design matching app theme
- Loading states
- Success/error toast notifications

**Fields:**
- Name *
- Genre *
- Country *
- Bio
- Image (with preview)

**Protected:** ✅ Requires authentication

---

### 2. Add Album (`/albums/add`)
**File:** `src/pages/AddAlbum.tsx`

**Features:**
- Album title (required)
- Artist selection dropdown (required)
- Release date picker (required)
- Genre (required)
- Record label (optional)
- Description (optional)
- Cover art upload with preview
- Form validation
- Glass morphism design
- Loading states
- Success/error toast notifications

**Fields:**
- Title *
- Artist * (dropdown)
- Release Date *
- Genre *
- Record Label
- Description
- Cover Art (with preview)

**Protected:** ✅ Requires authentication

---

### 3. Add Song (`/songs/add`)
**File:** `src/pages/AddSong.tsx`

**Features:**
- Song title (required)
- Main artist selection (required)
- Featured artists (dynamic list with add/remove)
- Album selection (optional)
- Duration (required)
- Genre (required)
- Release date (required)
- Producers (dynamic list with add/remove)
- Lyrics textarea
- Cover art upload with preview
- Audio file upload
- Form validation
- Glass morphism design
- Loading states
- Success/error toast notifications

**Fields:**
- Title *
- Main Artist * (dropdown)
- Featured Artists (dynamic chips)
- Album (dropdown)
- Duration *
- Genre *
- Release Date *
- Producers (dynamic chips)
- Lyrics (monospace textarea)
- Cover Art (with preview)
- Audio File

**Protected:** ✅ Requires authentication

---

## 🔗 Routes Added

```typescript
// In App.tsx
<Route path="/artists/add" element={<ProtectedRoute><AddArtist /></ProtectedRoute>} />
<Route path="/albums/add" element={<ProtectedRoute><AddAlbum /></ProtectedRoute>} />
<Route path="/songs/add" element={<ProtectedRoute><AddSong /></ProtectedRoute>} />
```

---

## 🎯 UI/UX Features

### Design System
- **Colors:** Indigo to purple gradient (`from-indigo-600 to-purple-600`)
- **Glass morphism:** Translucent cards with backdrop blur
- **Dark mode:** Full support with proper color schemes
- **Animations:** Framer Motion fade-in effects
- **Icons:** Lucide React icons

### Form Features
- **Image Upload:** Preview before submission
- **Audio Upload:** File name display after selection
- **Dynamic Lists:** Add/remove featured artists and producers with chip UI
- **Date Picker:** Native date input
- **Dropdowns:** Shadcn Select components
- **Validation:** Required fields marked with *
- **Loading States:** Spinner on submit button
- **Toast Notifications:** Success/error feedback

### Navigation
- **Back Button:** Returns to respective list page
- **Cancel Button:** Returns without saving
- **Save Button:** Gradient button with loading state

---

## 🔘 "Add New" Buttons Added

Updated three existing pages to include "Add New" buttons in the header:

### Artists Page
```tsx
<Button onClick={() => navigate('/artists/add')}>
  <Plus className="w-4 h-4 mr-2" />
  Add Artist
</Button>
```

### Albums Page
```tsx
<Button onClick={() => navigate('/albums/add')}>
  <Plus className="w-4 h-4 mr-2" />
  Add Album
</Button>
```

### Songs Page
```tsx
<Button onClick={() => navigate('/songs/add')}>
  <Plus className="w-4 h-4 mr-2" />
  Add Song
</Button>
```

---

## 🛠️ TODO: Backend Integration

Currently, the forms use simulated API calls. To integrate with the backend:

### 1. Create API Endpoints

**Backend Routes Needed:**
```javascript
// In backend-api/server.js or routes/

// Artists
POST /api/artists
  - Body: multipart/form-data
  - Fields: name, genre, country, bio, image (file)
  - Response: { success: true, artist: {...} }

// Albums
POST /api/albums
  - Body: multipart/form-data
  - Fields: title, artist, releaseDate, genre, recordLabel, description, coverArt (file)
  - Response: { success: true, album: {...} }

// Songs
POST /api/songs
  - Body: multipart/form-data
  - Fields: title, artist, album, duration, genre, releaseDate, lyrics, 
            featuredArtists (JSON), producers (JSON), coverArt (file), audioFile (file)
  - Response: { success: true, song: {...} }
```

### 2. Update Form Submission

**In each AddX.tsx file, uncomment and update:**

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const formDataToSend = new FormData();
    formDataToSend.append('title', formData.title);
    // ... add all fields
    
    if (formData.image) {
      formDataToSend.append('image', formData.image);
    }

    const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/artists`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`, // Add JWT token
      },
      body: formDataToSend,
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save');
    }

    toast({
      title: "Success!",
      description: result.message,
    });

    navigate('/artists');
  } catch (error) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};
```

### 3. Add JWT Authentication

```typescript
import { fetchAuthSession } from 'aws-amplify/auth';

const session = await fetchAuthSession();
const accessToken = session.tokens?.accessToken.toString();

// Include in fetch headers
headers: {
  'Authorization': `Bearer ${accessToken}`,
}
```

### 4. Update Dropdowns with Real Data

**Fetch artists and albums for dropdowns:**

```typescript
// In AddAlbum.tsx and AddSong.tsx
const { data: artistsData } = useQuery({
  queryKey: ['artists'],
  queryFn: () => fetch(`${import.meta.env.VITE_API_ENDPOINT}/artists`).then(r => r.json()),
});

const { data: albumsData } = useQuery({
  queryKey: ['albums'],
  queryFn: () => fetch(`${import.meta.env.VITE_API_ENDPOINT}/albums`).then(r => r.json()),
});
```

---

## 📸 File Uploads

### Image Requirements
- **Artists:** Square image, at least 500x500px
- **Albums:** Square image, at least 1000x1000px
- **Songs:** Square image, at least 1000x1000px

### Audio Requirements
- **Format:** MP3, WAV, FLAC
- **Max Size:** TBD (recommend 10MB)

### S3 Integration
Files should be uploaded to S3 bucket: `lyricscape-lyrics-images-prod`

**Backend upload flow:**
1. Receive multipart/form-data
2. Upload image/audio to S3
3. Store S3 URL in database
4. Return object with URLs

---

## 🔐 Security

### Authentication
- All routes wrapped in `<ProtectedRoute>`
- Redirects to `/login` if not authenticated
- JWT token required for API calls

### Validation
- Client-side validation (required fields)
- Server-side validation needed in backend
- File type validation
- File size limits

---

## 🎨 Styling

### Theme
- Gradient: `from-indigo-600 to-purple-600`
- Glass effect: `backdrop-blur-xl bg-white/10 dark:bg-black/40`
- Border: `border border-white/20`

### Components Used
- `Button` - Shadcn UI
- `Input` - Shadcn UI
- `Textarea` - Shadcn UI
- `Label` - Shadcn UI
- `Select` - Shadcn UI
- `useToast` - Custom hook

---

## 📱 Responsive Design

- **Mobile:** Single column, full-width forms
- **Tablet:** Centered forms, max-width 2xl
- **Desktop:** Centered forms, max-width 2xl
- **Image previews:** Responsive sizing
- **Buttons:** Stack vertically on mobile

---

## ✨ User Experience

1. **Click "Add Artist/Album/Song"** button on list page
2. **Fill form** with required and optional fields
3. **Upload images/audio** with instant preview
4. **Submit** with loading indicator
5. **See toast notification** for success/error
6. **Redirect** to list page on success

---

## 🧪 Testing

### Manual Testing Steps

1. **Navigate to page:**
   ```
   /artists/add
   /albums/add
   /songs/add
   ```

2. **Test form validation:**
   - Submit empty form → should show errors
   - Fill only required fields → should succeed
   - Test image upload → preview should appear

3. **Test authentication:**
   - Access page without login → redirect to `/login`
   - Login and access page → should work

4. **Test navigation:**
   - Click "Back" button → return to list
   - Click "Cancel" button → return to list
   - Submit form successfully → redirect to list

---

## 🚀 Next Steps

1. **Backend API:**
   - Create POST endpoints for artists, albums, songs
   - Implement file upload to S3
   - Add JWT authentication middleware
   - Database schema for new entities

2. **Enhancements:**
   - Auto-generate slug from title
   - Image cropping tool
   - Drag & drop file upload
   - Bulk upload for songs
   - Edit functionality (update existing entries)
   - Delete functionality

3. **Validation:**
   - More robust client-side validation
   - Server-side validation
   - File type/size validation
   - Duplicate checking

4. **Features:**
   - Rich text editor for biography/description
   - Lyrics formatting toolbar
   - Auto-complete for artists/genres
   - Search as you type for dropdowns
   - Preview mode before saving

---

## 📝 Notes

- Forms are currently using **mock data** for dropdowns
- API calls are **simulated** with timeouts
- File uploads are **client-side only** (need S3 integration)
- All pages follow the **same design pattern** for consistency
- Forms include **accessibility** features (labels, required attributes)

---

## 🎯 Usage

**To access the pages:**
1. Login at `/login`
2. Navigate to `/artists`, `/albums`, or `/songs`
3. Click the **"Add Artist/Album/Song"** button
4. Fill out the form
5. Click **"Add Artist/Album/Song"** to save

**Or directly:**
- `/artists/add`
- `/albums/add`
- `/songs/add`

All routes are protected and will redirect to `/login` if not authenticated.
