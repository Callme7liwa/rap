import { useQuery } from '@tanstack/react-query';
import { fetchAuthSession } from 'aws-amplify/auth';

interface ArtistProfile {
  artist: {
    id: number;
    name: string;
    image_url: string;
  };
  association: {
    artist_id: number;
    associated_at: number;
  };
}

/**
 * Hook to check if the current user owns an artist profile
 * Returns the artist profile if associated, null otherwise
 */
export function useArtistOwnership() {
  return useQuery<ArtistProfile | null>({
    queryKey: ['artist-ownership'],
    queryFn: async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken?.toString();

        if (!token) {
          return null;
        }

        const apiUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';
        const response = await fetch(`${apiUrl}/artist-profile/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.status === 404 || response.status === 403) {
          // User is not associated with any artist
          return null;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch artist profile');
        }

        return await response.json();
      } catch (error) {
        console.error('Error checking artist ownership:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    retry: false, // Don't retry on 404
  });
}

/**
 * Hook to check if user owns a specific artist
 */
export function useOwnsArtist(artistId: number) {
  const { data: ownership } = useArtistOwnership();
  return ownership?.artist?.id === artistId;
}

/**
 * Hook to check if user owns a specific item by artist ID
 */
export function useOwnsContent(artistId: number) {
  const { data: ownership } = useArtistOwnership();
  return ownership?.artist?.id === artistId;
}
