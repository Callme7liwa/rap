import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { Navigation } from "@/components/Navigation";
import AuthProvider from "./components/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoute from "./components/AdminRoute";
import ArtistRoute from "./components/ArtistRoute";
import AdminLayout from "./layouts/AdminLayout";
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
import Voting from "./pages/Voting";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import BlogCreate from "./pages/BlogCreate";
import BlogEdit from "./pages/BlogEdit";
import Login from "./pages/Login";
import Search from "./pages/Search";
import AdminDashboard from "./pages/AdminDashboard";
import AdminArtistManagement from "./pages/AdminArtistManagement";
import AdminUserManagement from "./pages/AdminUserManagement";
import { AdminCollabSettings } from "./pages/AdminCollabSettings";
import NotFound from "./pages/NotFound";
import { ArtistCollabRequestsPage } from "./pages/ArtistCollabRequestsPage";
import { MyCollabRequestsPage } from "./pages/MyCollabRequestsPage";
import { useAuth } from "./store/auth.store";

const queryClient = new QueryClient();

function NonAdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useAuth();
  const location = useLocation();

  if (isAdmin && !location.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}

function AppShell() {
  const { isAdmin } = useAuth();

  return (
    <>
      {!isAdmin && <Navigation />}
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUserManagement />} />
          <Route path="artists" element={<AdminArtistManagement />} />
          <Route path="collab" element={<AdminCollabSettings />} />
          <Route path="voting" element={<CreateVotingEvent />} />
          <Route path="artist-management" element={<Navigate to="/admin/artists" replace />} />
          <Route path="user-management" element={<Navigate to="/admin/users" replace />} />
          <Route path="collab-settings" element={<Navigate to="/admin/collab" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route
          path="/voting/create"
          element={
            <AdminRoute>
              <Navigate to="/admin/voting" replace />
            </AdminRoute>
          }
        />
        <Route path="/" element={<NonAdminRoute><Home /></NonAdminRoute>} />
        <Route path="/login" element={<NonAdminRoute><Login /></NonAdminRoute>} />
        <Route path="/artists" element={<NonAdminRoute><Artists /></NonAdminRoute>} />
        <Route path="/artists/add" element={<AdminRoute><AddArtist /></AdminRoute>} />
        <Route path="/artists/:id" element={<NonAdminRoute><ArtistDetail /></NonAdminRoute>} />
        <Route path="/artists/:id/edit" element={<AdminRoute><EditArtist /></AdminRoute>} />
        <Route path="/albums" element={<NonAdminRoute><Albums /></NonAdminRoute>} />
        <Route path="/albums/add" element={<NonAdminRoute><ArtistRoute><AddAlbum /></ArtistRoute></NonAdminRoute>} />
        <Route path="/albums/:id" element={<NonAdminRoute><AlbumDetail /></NonAdminRoute>} />
        <Route path="/albums/:id/edit" element={<NonAdminRoute><ArtistRoute><EditAlbum /></ArtistRoute></NonAdminRoute>} />
        <Route path="/songs" element={<NonAdminRoute><Songs /></NonAdminRoute>} />
        <Route path="/songs/add" element={<NonAdminRoute><ArtistRoute><AddSong /></ArtistRoute></NonAdminRoute>} />
        <Route path="/songs/:id" element={<NonAdminRoute><SongDetail /></NonAdminRoute>} />
        <Route path="/songs/:id/edit" element={<NonAdminRoute><ArtistRoute><EditSong /></ArtistRoute></NonAdminRoute>} />
        <Route path="/my-uploads" element={<NonAdminRoute><ProtectedRoute><MyUploads /></ProtectedRoute></NonAdminRoute>} />
        <Route path="/tools/lyrics-card" element={<NonAdminRoute><LyricsCardMaker /></NonAdminRoute>} />
        <Route path="/voting" element={<NonAdminRoute><Voting /></NonAdminRoute>} />
        <Route path="/voting/my-votes" element={<NonAdminRoute><ProtectedRoute><MyVotes /></ProtectedRoute></NonAdminRoute>} />
        <Route path="/collab-requests" element={<NonAdminRoute><ProtectedRoute><ArtistCollabRequestsPage /></ProtectedRoute></NonAdminRoute>} />
        <Route path="/my-collab-requests" element={<NonAdminRoute><ProtectedRoute><MyCollabRequestsPage /></ProtectedRoute></NonAdminRoute>} />
        <Route path="/user/activity" element={<NonAdminRoute><ProtectedRoute><UserActivity /></ProtectedRoute></NonAdminRoute>} />
        <Route path="/user/profile" element={<NonAdminRoute><ProtectedRoute><UserProfile /></ProtectedRoute></NonAdminRoute>} />
        <Route path="/blog" element={<NonAdminRoute><Blog /></NonAdminRoute>} />
        <Route path="/blog/create" element={<NonAdminRoute><ArtistRoute><BlogCreate /></ArtistRoute></NonAdminRoute>} />
        <Route path="/blog/:slug/edit" element={<NonAdminRoute><ArtistRoute><BlogEdit /></ArtistRoute></NonAdminRoute>} />
        <Route path="/blog/:slug" element={<NonAdminRoute><BlogDetail /></NonAdminRoute>} />
        <Route path="/search" element={<NonAdminRoute><Search /></NonAdminRoute>} />
        <Route path="*" element={<NonAdminRoute><NotFound /></NonAdminRoute>} />
      </Routes>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
