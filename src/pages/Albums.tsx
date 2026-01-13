import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getAlbums } from '@/lib/api';
import { AlbumCard } from '@/components/AlbumCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Disc, Plus } from 'lucide-react';
import { useArtistOwnership } from '@/hooks/useArtistOwnership';

export default function Albums() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1');
  const { data: ownership } = useArtistOwnership();

  const { data, isLoading } = useQuery({
    queryKey: ['albums', { page }],
    queryFn: () => getAlbums({ page, limit: 24 }),
  });

  // Sort albums to show owned albums first
  const sortedAlbums = useMemo(() => {
    if (!data?.data || !ownership?.artist?.id) return data?.data || [];

    const ownedArtistId = ownership.artist.id;
    return [...data.data].sort((a, b) => {
      if (a.artist_id === ownedArtistId && b.artist_id !== ownedArtistId) return -1;
      if (a.artist_id !== ownedArtistId && b.artist_id === ownedArtistId) return 1;
      return 0;
    });
  }, [data?.data, ownership]);

  const handlePageChange = (newPage: number) => {
    setSearchParams({ page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Disc className="w-8 h-8 text-primary" />
              <h1>Albums</h1>
            </div>
            <Button
              onClick={() => navigate('/albums/add')}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Album
            </Button>
          </div>
          <p className="text-muted-foreground">
            Explore the latest albums and releases
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <div className="text-center py-16">
            <Disc className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-display text-xl font-semibold mb-2">No albums found</h3>
            <p className="text-muted-foreground">Check back later for new releases</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {sortedAlbums.map((album, i) => (
                <AlbumCard key={album.id} album={album} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-4">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
