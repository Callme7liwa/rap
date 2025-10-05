import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { search } from '@/lib/api';
import { ArtistCard } from '@/components/ArtistCard';
import { AlbumCard } from '@/components/AlbumCard';
import { SongRow } from '@/components/SongRow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Search as SearchIcon, Users, Disc, ListMusic } from 'lucide-react';

export default function Search() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  const { data, isLoading } = useQuery({
    queryKey: ['search', query],
    queryFn: () => search(query),
    enabled: query.length > 0,
  });

  if (!query) {
    return (
      <div className="min-h-screen py-16">
        <div className="container mx-auto px-4 text-center">
          <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Search for music</h2>
          <p className="text-muted-foreground">
            Use the search bar above to find artists, albums, and songs
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="mb-2">Search Results</h1>
          <p className="text-muted-foreground">
            Showing results for <span className="font-medium text-foreground">"{query}"</span>
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          </div>
        ) : (
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList>
              <TabsTrigger value="all">
                All Results
              </TabsTrigger>
              <TabsTrigger value="artists" className="gap-2">
                <Users className="w-4 h-4" />
                Artists ({data?.artists.length || 0})
              </TabsTrigger>
              <TabsTrigger value="albums" className="gap-2">
                <Disc className="w-4 h-4" />
                Albums ({data?.albums.length || 0})
              </TabsTrigger>
              <TabsTrigger value="songs" className="gap-2">
                <ListMusic className="w-4 h-4" />
                Songs ({data?.songs.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-8">
              {data?.artists && data.artists.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl font-bold mb-4">Artists</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {data.artists.slice(0, 6).map((artist, i) => (
                      <ArtistCard key={artist.id} artist={artist} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {data?.albums && data.albums.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl font-bold mb-4">Albums</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {data.albums.slice(0, 4).map((album, i) => (
                      <AlbumCard key={album.id} album={album} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {data?.songs && data.songs.length > 0 && (
                <section>
                  <h2 className="font-display text-2xl font-bold mb-4">Songs</h2>
                  <div className="space-y-2">
                    {data.songs.slice(0, 10).map((song, i) => (
                      <SongRow key={song.id} song={song} index={i} />
                    ))}
                  </div>
                </section>
              )}

              {!data?.artists?.length && !data?.albums?.length && !data?.songs?.length && (
                <div className="text-center py-16">
                  <SearchIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-2">No results found</h3>
                  <p className="text-muted-foreground">
                    Try searching with different keywords
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="artists">
              {data?.artists && data.artists.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {data.artists.map((artist, i) => (
                    <ArtistCard key={artist.id} artist={artist} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-2">No artists found</h3>
                </div>
              )}
            </TabsContent>

            <TabsContent value="albums">
              {data?.albums && data.albums.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {data.albums.map((album, i) => (
                    <AlbumCard key={album.id} album={album} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Disc className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-2">No albums found</h3>
                </div>
              )}
            </TabsContent>

            <TabsContent value="songs">
              {data?.songs && data.songs.length > 0 ? (
                <div className="space-y-2">
                  {data.songs.map((song, i) => (
                    <SongRow key={song.id} song={song} index={i} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <ListMusic className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-display text-xl font-semibold mb-2">No songs found</h3>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
