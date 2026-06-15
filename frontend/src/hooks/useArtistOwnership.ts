import { useQuery } from '@tanstack/react-query';
import { getMyArtistProfile } from '@/lib/api-client';
import { useAuth } from '@/store/auth.store';

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
  const { isAuthenticated, isArtist } = useAuth();

  return useQuery<ArtistProfile | null>({
    queryKey: ['artist-ownership'],
    queryFn: async () => {
      if (!isAuthenticated || !isArtist) return null;
      return getMyArtistProfile();
    },
    enabled: isAuthenticated,
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
