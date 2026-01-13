import { useQuery } from '@tanstack/react-query';
import { getArtists, getAlbums, getSongs } from '@/lib/api';
import { ArtistCard } from '@/components/ArtistCard';
import { AlbumCard } from '@/components/AlbumCard';
import { SongRow } from '@/components/SongRow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { ArrowRight, Music, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { data: artistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ['artists', { limit: 6 }],
    queryFn: () => getArtists({ limit: 6 }),
  });

  const { data: albumsData, isLoading: albumsLoading } = useQuery({
    queryKey: ['albums', { limit: 4 }],
    queryFn: () => getAlbums({ limit: 4 }),
  });

  const { data: songsData, isLoading: songsLoading } = useQuery({
    queryKey: ['songs', { limit: 5 }],
    queryFn: () => getSongs({ limit: 5 }),
  });

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        
        <div className="container mx-auto px-4 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 animate-glow-pulse">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Your Ultimate Music & Lyrics Destination</span>
            </div>
            
            <h1 className="mb-6">
              Discover Music.
              <br />
              <span className="text-gradient">Read Lyrics.</span>
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Explore thousands of songs, dive into lyrics, and create beautiful lyric cards. Your journey through music starts here.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/artists">
                <Button size="lg" className="gap-2 bg-gradient-primary hover:opacity-90">
                  <Music className="w-5 h-5" />
                  Explore Artists
                </Button>
              </Link>
              <Link to="/tools/lyrics-card">
                <Button size="lg" variant="outline" className="gap-2">
                  Create Lyric Card
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-4 pb-20 space-y-16">
        {/* Featured Artists */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="mb-2">Featured Artists</h2>
              <p className="text-muted-foreground">Discover talented musicians</p>
            </div>
            <Link to="/artists">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {artistsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {(artistsData?.data || []).map((artist, i) => (
                <ArtistCard key={artist.id} artist={artist} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* New Releases */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="mb-2">New Releases</h2>
              <p className="text-muted-foreground">Latest albums and singles</p>
            </div>
            <Link to="/albums">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {albumsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(albumsData?.data || []).map((album, i) => (
                <AlbumCard key={album.id} album={album} index={i} />
              ))}
            </div>
          )}
        </section>

        {/* Trending Songs */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="mb-2">Trending Songs</h2>
              <p className="text-muted-foreground">Popular tracks right now</p>
            </div>
            <Link to="/songs">
              <Button variant="ghost" className="gap-2">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {songsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {(songsData?.data || []).map((song, i) => (
                <SongRow key={song.id} song={song} index={i} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
