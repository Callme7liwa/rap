import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getArtistById, getArtistSongs, getArtistAlbums } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SongRow } from '@/components/SongRow';
import { AlbumCard } from '@/components/AlbumCard';
import { Instagram, Twitter, Facebook, Users, Music, Disc, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const artistId = parseInt(id || '0');

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtistById(artistId),
    enabled: !!artistId,
  });

  const { data: songs } = useQuery({
    queryKey: ['artist-songs', artistId],
    queryFn: () => getArtistSongs(artistId),
    enabled: !!artistId,
  });

  const { data: albums } = useQuery({
    queryKey: ['artist-albums', artistId],
    queryFn: () => getArtistAlbums(artistId),
    enabled: !!artistId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Skeleton className="h-80 w-full" />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="h-96" />
            <Skeleton className="h-96 lg:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Artist not found</h2>
          <p className="text-muted-foreground mb-6">The artist you're looking for doesn't exist</p>
          <Link to="/artists">
            <Button>Browse Artists</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header Banner */}
      <div className="relative h-80 overflow-hidden">
        <img
          src={artist.header_image_url}
          alt={artist.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
        
        <div className="absolute bottom-0 left-0 right-0">
          <div className="container mx-auto px-4 pb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-end gap-6"
            >
              <div className="w-32 h-32 rounded-xl overflow-hidden border-4 border-background shadow-elevated flex-shrink-0">
                <img
                  src={artist.image_url}
                  alt={artist.name}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="pb-2">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl md:text-5xl">{artist.name}</h1>
                  {artist.is_verified && (
                    <CheckCircle2 className="w-8 h-8 text-primary glow-primary" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="font-medium">{artist.followers_count.toLocaleString()} followers</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar */}
          <div className="space-y-6">
            <div className="glass rounded-xl p-6">
              <h3 className="font-display font-semibold mb-4">About</h3>
              
              {artist.alternate_names.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm text-muted-foreground mb-2">Also known as</p>
                  <div className="flex flex-wrap gap-2">
                    {artist.alternate_names.map((name, i) => (
                      <Badge key={i} variant="secondary">{name}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Songs</span>
                  <span className="font-medium">{artist.songs_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Followers</span>
                  <span className="font-medium">{artist.followers_count.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {(artist.instagram_name || artist.twitter_name || artist.facebook_name) && (
              <div className="glass rounded-xl p-6">
                <h3 className="font-display font-semibold mb-4">Social Links</h3>
                <div className="space-y-3">
                  {artist.instagram_name && (
                    <a
                      href={`https://instagram.com/${artist.instagram_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Instagram className="w-5 h-5" />
                      <span>@{artist.instagram_name}</span>
                    </a>
                  )}
                  {artist.twitter_name && (
                    <a
                      href={`https://twitter.com/${artist.twitter_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Twitter className="w-5 h-5" />
                      <span>@{artist.twitter_name}</span>
                    </a>
                  )}
                  {artist.facebook_name && (
                    <a
                      href={`https://facebook.com/${artist.facebook_name}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors"
                    >
                      <Facebook className="w-5 h-5" />
                      <span>{artist.facebook_name}</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Albums */}
            {albums && albums.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Disc className="w-6 h-6 text-primary" />
                  <h2 className="font-display text-2xl font-bold">Albums</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {albums.map((album, i) => (
                    <AlbumCard key={album.id} album={album} index={i} />
                  ))}
                </div>
              </section>
            )}

            {/* Top Songs */}
            {songs && songs.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-6">
                  <Music className="w-6 h-6 text-primary" />
                  <h2 className="font-display text-2xl font-bold">Top Songs</h2>
                </div>
                <div className="space-y-2">
                  {songs.slice(0, 10).map((song, i) => (
                    <SongRow key={song.id} song={song} index={i} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
