import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { getSongs } from '@/lib/api';
import { SongRow } from '@/components/SongRow';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, ListMusic } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export default function Songs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const debouncedQuery = useDebounce(searchQuery, 300);
  const page = parseInt(searchParams.get('page') || '1');

  const { data, isLoading } = useQuery({
    queryKey: ['songs', { query: debouncedQuery, page }],
    queryFn: () => getSongs({ query: debouncedQuery, page, limit: 20 }),
  });

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setSearchParams({ q: value, page: '1' });
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams({ q: debouncedQuery, page: newPage.toString() });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <ListMusic className="w-8 h-8 text-primary" />
            <h1>Songs</h1>
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
              placeholder="Search songs by title or artist..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : data?.data.length === 0 ? (
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
              {data?.data.map((song, i) => (
                <SongRow key={song.id} song={song} index={i} />
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
