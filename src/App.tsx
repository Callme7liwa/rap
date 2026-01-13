import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import AuthProvider from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ArtistRoute from "./components/ArtistRoute";
import Home from "./pages/Home";
import Artists from "./pages/Artists";
import ArtistDetail from "./pages/ArtistDetail";
import AddArtist from "./pages/AddArtist";
import EditArtist from "./pages/EditArtist";
import Albums from "./pages/Albums";
import AlbumDetail from "./pages/AlbumDetail";
import AddAlbum from "./pages/AddAlbum";
import EditAlbum from "./pages/EditAlbum";
import Songs from "./pages/Songs";
import SongDetail from "./pages/SongDetail";
import AddSong from "./pages/AddSong";
import EditSong from "./pages/EditSong";
import MyUploads from "./pages/MyUploads";
import CreateVotingEvent from "./pages/CreateVotingEvent";
import MyVotes from "./pages/MyVotes";
import UserActivity from "./pages/UserActivity";
import UserProfile from "./pages/UserProfile";
import LyricsCardMaker from "./pages/LyricsCardMaker";
import S3ImageManager from "./pages/S3ImageManager";
import Voting from "./pages/Voting";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import BlogCreate from "./pages/BlogCreate";
import BlogEdit from "./pages/BlogEdit";
import Login from "./pages/Login";
import Search from "./pages/Search";
import AdminArtistManagement from "./pages/AdminArtistManagement";
import AdminUserManagement from "./pages/AdminUserManagement";
import { AdminCollabSettings } from "./pages/AdminCollabSettings";
import NotFound from "./pages/NotFound";
import { ArtistCollabRequestsPage } from "./pages/ArtistCollabRequestsPage";
import { MyCollabRequestsPage } from "./pages/MyCollabRequestsPage";

// Import Amplify configuration
import "./lib/amplify-config";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navigation />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/artists" element={<Artists />} />
            <Route path="/artists/add" element={<AdminRoute><AddArtist /></AdminRoute>} />
            <Route path="/artists/:id" element={<ArtistDetail />} />
            <Route path="/artists/:id/edit" element={<AdminRoute><EditArtist /></AdminRoute>} />
            <Route path="/albums" element={<Albums />} />
            <Route path="/albums/add" element={<ArtistRoute><AddAlbum /></ArtistRoute>} />
            <Route path="/albums/:id" element={<AlbumDetail />} />
            <Route path="/albums/:id/edit" element={<ArtistRoute><EditAlbum /></ArtistRoute>} />
            <Route path="/songs" element={<Songs />} />
            <Route path="/songs/add" element={<ArtistRoute><AddSong /></ArtistRoute>} />
            <Route path="/songs/:id" element={<SongDetail />} />
            <Route path="/songs/:id/edit" element={<ArtistRoute><EditSong /></ArtistRoute>} />
            <Route path="/my-uploads" element={<ProtectedRoute><MyUploads /></ProtectedRoute>} />
            <Route path="/tools/lyrics-card" element={<LyricsCardMaker />} />
            <Route path="/tools/s3-manager" element={<AdminRoute><S3ImageManager /></AdminRoute>} />
            <Route path="/voting" element={<Voting />} />
            <Route path="/voting/create" element={<AdminRoute><CreateVotingEvent /></AdminRoute>} />
            <Route path="/voting/my-votes" element={<ProtectedRoute><MyVotes /></ProtectedRoute>} />
            <Route path="/admin/artist-management" element={<AdminRoute><AdminArtistManagement /></AdminRoute>} />
            <Route path="/admin/user-management" element={<AdminRoute><AdminUserManagement /></AdminRoute>} />
            <Route path="/admin/collab-settings" element={<AdminRoute><AdminCollabSettings /></AdminRoute>} />
            <Route path="/collab-requests" element={<ProtectedRoute><ArtistCollabRequestsPage /></ProtectedRoute>} />
            <Route path="/my-collab-requests" element={<ProtectedRoute><MyCollabRequestsPage /></ProtectedRoute>} />
            <Route path="/user/activity" element={<ProtectedRoute><UserActivity /></ProtectedRoute>} />
            <Route path="/user/profile" element={<ProtectedRoute><UserProfile /></ProtectedRoute>} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/create" element={<ArtistRoute><BlogCreate /></ArtistRoute>} />
            <Route path="/blog/:slug/edit" element={<ArtistRoute><BlogEdit /></ArtistRoute>} />
            <Route path="/blog/:slug" element={<BlogDetail />} />
            <Route path="/search" element={<Search />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
