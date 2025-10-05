import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSongById, getArtistById, getAlbumById } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Calendar, Music, Eye, MessageSquare, Copy, Share2, User, Disc } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { toast } from 'sonner';

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id || '0');
  const [isRTL, setIsRTL] = useState(false);

  const { data: song, isLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => getSongById(songId),
    enabled: !!songId,
  });

  const { data: artist } = useQuery({
    queryKey: ['artist', song?.primary_artist_id],
    queryFn: () => getArtistById(song!.primary_artist_id),
    enabled: !!song?.primary_artist_id,
  });

  const { data: album } = useQuery({
    queryKey: ['album', song?.album_id],
    queryFn: () => getAlbumById(song!.album_id!),
    enabled: !!song?.album_id,
  });

  const copyLyrics = () => {
    if (song?.lyrics) {
      navigator.clipboard.writeText(song.lyrics);
      toast.success('Lyrics copied to clipboard!');
    }
  };

  const shareSong = () => {
    if (navigator.share && song) {
      navigator.share({
        title: song.full_title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <Skeleton className="h-6 w-64 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-96" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!song) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Music className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-2xl font-bold mb-2">Song not found</h2>
          <p className="text-muted-foreground mb-6">The song you're looking for doesn't exist</p>
          <Link to="/songs">
            <Button>Browse Songs</Button>
          </Link>
        </div>
      </div>
    );
  }

  const hasArabic = /[\u0600-\u06FF]/.test(song.lyrics);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-8">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/songs">Songs</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            {album && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink href={`/albums/${album.id}`}>{album.name}</BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>{song.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Song Artwork */}
          <div className="space-y-6">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-elevated">
              <img
                src={song.song_art_image_url}
                alt={song.title}
                className="w-full h-full object-cover"
              />
            </div>
            
            <div className="space-y-2">
              <Link to={`/artists/${song.primary_artist_id}`}>
                <Button variant="outline" className="w-full gap-2">
                  <User className="w-4 h-4" />
                  View Artist
                </Button>
              </Link>
              
              {album && (
                <Link to={`/albums/${album.id}`}>
                  <Button variant="outline" className="w-full gap-2">
                    <Disc className="w-4 h-4" />
                    View Album
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Song Info & Lyrics */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="mb-2">{song.title}</h1>
              <Link
                to={`/artists/${song.primary_artist_id}`}
                className="text-xl text-muted-foreground hover:text-primary transition-colors"
              >
                {song.primary_artist_name}
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="gap-2">
                <Calendar className="w-3 h-3" />
                {song.release_date_for_display}
              </Badge>
              <Badge variant="secondary" className="gap-2">
                <Eye className="w-3 h-3" />
                {(song.pageviews / 1000).toFixed(1)}K views
              </Badge>
              <Badge variant="secondary" className="gap-2">
                <MessageSquare className="w-3 h-3" />
                {song.annotation_count} annotations
              </Badge>
              {song.instrumental && (
                <Badge variant="outline">Instrumental</Badge>
              )}
            </div>

            {/* Lyrics Viewer */}
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl font-bold flex items-center gap-2">
                  <Music className="w-6 h-6 text-primary" />
                  Lyrics
                </h2>
                
                <div className="flex items-center gap-2">
                  {hasArabic && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsRTL(!isRTL)}
                    >
                      {isRTL ? 'LTR' : 'RTL'}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyLyrics}
                    className="gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={shareSong}
                    className="gap-2"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </Button>
                </div>
              </div>

              {song.instrumental ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>This is an instrumental track with no lyrics</p>
                </div>
              ) : (
                <div
                  className={`prose prose-invert max-w-none ${isRTL ? 'text-right' : ''}`}
                  dir={isRTL ? 'rtl' : 'ltr'}
                >
                  <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                    {song.lyrics}
                  </pre>
                </div>
              )}
            </div>

            {/* Create Lyrics Card CTA */}
            <div className="glass rounded-xl p-6 flex items-center justify-between">
              <div>
                <h3 className="font-display font-semibold mb-1">Love these lyrics?</h3>
                <p className="text-sm text-muted-foreground">Create a beautiful lyric card to share</p>
              </div>
              <Link to={`/tools/lyrics-card?song=${song.id}`}>
                <Button className="bg-gradient-primary">
                  Create Card
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
