import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth.store';

interface ArtistRouteProps {
  children: ReactNode;
}

/**
 * ArtistRoute component to protect artist-only pages
 * Checks if user is authenticated AND is associated with an artist
 */
export default function ArtistRoute({ children }: ArtistRouteProps) {
  const { isAuthenticated, isArtist } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isArtist) {
      toast.error('Artist Access Required', {
        description: 'You need an artist role to access this page.',
      });
    }
  }, [isArtist, isAuthenticated]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is an artist
  if (!isArtist) {
    // Show error page for non-artist users
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">🎵</div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Artist Access Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This page is restricted to artists only. You need to be associated with an artist profile to add songs and albums.
            Please contact an administrator to link your account to an artist profile.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Render artist content
  return <>{children}</>;
}
