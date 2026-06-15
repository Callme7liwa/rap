import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getAlbumById, getSongs, getArtistById } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LikeButton } from '@/components/LikeButton';
import { CommentSection } from '@/components/CommentSection';
import { EditButton } from '@/components/EditButton';
import { useOwnsContent } from '@/hooks/useArtistOwnership';
import { Calendar, Disc, Music, User } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AlbumDetail() {
  const { id } = useParams<{ id: string }>();
  const albumId = parseInt(id || '0');
  const navigate = useNavigate();

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => getAlbumById(albumId),
    enabled: !!albumId,
  });

  const isOwned = useOwnsContent(album?.artist_id);

  const { data: artist } = useQuery({
    queryKey: ['artist', album?.artist_id],
    queryFn: () => getArtistById(album!.artist_id),
    enabled: !!album?.artist_id,
  });

  const { data: songsData } = useQuery({
    queryKey: ['album-songs', albumId],
    queryFn: () => getSongs({ albumId }),
    enabled: !!albumId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="aspect-square rounded-none" />
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-96" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!album) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Disc className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Album not found</h2>
          <p className="text-muted-foreground mb-6">The album you're looking for doesn't exist</p>
          <Link to="/albums">
            <Button>Browse Albums</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Album Cover */}
          <div className="space-y-6">
            <div className="aspect-square rounded-none overflow-hidden shadow-elevated">
              <img
                src={album.cover_art_url}
                alt={album.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            {artist && (
              <Link to={`/artists/${artist.id}`}>
                <Button variant="outline" className="w-full gap-2">
                  <User className="w-4 h-4" />
                  View Artist
                </Button>
              </Link>
            )}
          </div>

          {/* Album Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center justify-between gap-4 mb-2">
                <h1 className="flex-1">{album.name}</h1>
                {isOwned && (
                  <EditButton
                    onClick={() => navigate(`/albums/${albumId}/edit`)}
                    variant="default"
                    size="md"
                    showText={true}
                  />
                )}
              </div>
              <Link
                to={`/artists/${album.artist_id}`}
                className="text-xl text-muted-foreground hover:text-primary transition-colors"
              >
                {album.artist_name}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Badge variant="secondary" className="gap-2">
                <Calendar className="w-3 h-3" />
                {album.release_date_for_display}
              </Badge>
              <Badge variant="secondary" className="gap-2">
                <Disc className="w-3 h-3" />
                {album.songs.length} tracks
              </Badge>
              <LikeButton
                contentType="album"
                contentId={album.id}
                showCount={true}
                variant="ghost"
                size="sm"
              />
            </div>

            {/* Tracklist */}
            <div className="glass rounded-none p-6">
              <h2 className="font-display text-2xl font-bold mb-6 flex items-center gap-2">
                <Music className="w-6 h-6 text-primary" />
                Tracklist
              </h2>
              
              <div className="space-y-2">
                {album.songs.map((track, index) => {
                  const fullSong = songsData?.data.find(s => s.id === track.id);
                  
                  return fullSong ? (
                    <Link
                      key={track.id}
                      to={`/songs/${track.id}`}
                      className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-muted-foreground font-medium w-8 text-center">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium group-hover:text-primary transition-colors">
                          {track.title}
                        </p>
                      </div>
                      {fullSong.lyrics_state === 'complete' && (
                        <Badge variant="secondary">Lyrics</Badge>
                      )}
                    </Link>
                  ) : (
                    <div
                      key={track.id || index}
                      className="flex items-center gap-4 p-3 rounded-lg opacity-60"
                    >
                      <span className="text-muted-foreground font-medium w-8 text-center">
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium">{track.title}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Comments Section */}
            <CommentSection
              type="album"
              itemId={album.id}
              itemName={album.name}
            />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
