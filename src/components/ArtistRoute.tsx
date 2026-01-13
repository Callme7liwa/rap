import { ReactNode, useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { toast } from 'sonner';
import { authenticatedFetch } from '@/lib/auth-helper';

interface ArtistRouteProps {
  children: ReactNode;
}

/**
 * ArtistRoute component to protect artist-only pages
 * Checks if user is authenticated AND is associated with an artist
 */
export default function ArtistRoute({ children }: ArtistRouteProps) {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const [isArtist, setIsArtist] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkArtistStatus = async () => {
      if (authStatus === 'authenticated' && user) {
        try {
          const apiUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';
          const response = await authenticatedFetch(`${apiUrl}/artist-profile/me`);
          
          if (response.ok) {
            const data = await response.json();
            setIsArtist(!!data.artist_id);
          } else {
            setIsArtist(false);
            toast.error('Artist Access Required', {
              description: 'You need to be associated with an artist profile to access this page.'
            });
          }
        } catch (error) {
          console.error('Error checking artist status:', error);
          setIsArtist(false);
          toast.error('Authentication Error', {
            description: 'Failed to verify artist access.'
          });
        }
      } else if (authStatus === 'unauthenticated') {
        toast.error('Authentication Required', {
          description: 'Please sign in to access this page.'
        });
      }
      setLoading(false);
    };

    checkArtistStatus();
  }, [authStatus, user]);

  // Show loading spinner while checking auth
  if (authStatus === 'configuring' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (authStatus !== 'authenticated' || !user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is an artist
  if (isArtist === false) {
    // Show error page for non-artist users
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
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
