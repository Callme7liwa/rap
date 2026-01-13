import { useState, useEffect, useRef, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSongs } from '@/lib/api';
import { SongRow } from '@/components/SongRow';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ListMusic, Plus, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { useArtistOwnership } from '@/hooks/useArtistOwnership';

export default function Songs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const { data: ownership } = useArtistOwnership();

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ['songs', { query: debouncedQuery }],
    queryFn: ({ pageParam }) => getSongs({
      query: debouncedQuery,
      limit: 20,
      cursor: pageParam
    }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined,
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setSearchParams(value ? { q: value } : {});
  };

  // Intersection Observer pour le chargement automatique
  useEffect(() => {
    if (!loadMoreRef.current || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadMoreRef.current);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allSongs = useMemo(() => {
    const songs = data?.pages.flatMap(page => page.data) || [];
    
    // Sort owned songs first
    if (ownership?.artist?.id) {
      return [...songs].sort((a, b) => {
        const aOwned = a.primary_artist_id === ownership.artist.id;
        const bOwned = b.primary_artist_id === ownership.artist.id;
        if (aOwned && !bOwned) return -1;
        if (!aOwned && bOwned) return 1;
        return 0;
      });
    }
    
    return songs;
  }, [data, ownership]);

  // Charger automatiquement TOUTES les chansons pendant la recherche
  useEffect(() => {
    if (debouncedQuery && hasNextPage && !isFetchingNextPage) {
      // Continuer à charger toutes les chansons correspondantes
      const timer = setTimeout(() => {
        fetchNextPage();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [debouncedQuery, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ListMusic className="w-8 h-8 text-primary" />
              <h1>Songs</h1>
            </div>
            <Button
              onClick={() => navigate('/songs/add')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Song
            </Button>
          </div>
          <p className="text-muted-foreground">
            Discover songs with complete lyrics and annotations
          </p>
        </div>

        <div className="mb-8">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search across all songs by title, artist, or lyrics..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {debouncedQuery && allSongs.length > 0 && (
            <div className="flex items-center justify-between mt-2 max-w-xl">
              <p className="text-sm text-muted-foreground">
                Found {allSongs.length} song{allSongs.length !== 1 ? 's' : ''}
              </p>
              {hasNextPage && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading more results...
                </p>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : allSongs.length === 0 ? (
          <div className="text-center py-16">
            <ListMusic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No songs found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or browse all songs
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {allSongs.map((song, i) => (
                <SongRow key={`${song.id}-${i}`} song={song} index={i} />
              ))}
            </div>

            {/* Sentinel pour le chargement automatique */}
            <div ref={loadMoreRef} className="py-8">
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading more songs...</span>
                </div>
              ) : hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    className="gap-2"
                  >
                    Load More Songs
                  </Button>
                </div>
              ) : allSongs.length > 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  No more songs to load
                </p>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
