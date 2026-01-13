import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSongById, getArtistById, getAlbumById } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LikeButton } from '@/components/LikeButton';
import { CommentSection } from '@/components/CommentSection';
import { EditButton } from '@/components/EditButton';
import { useOwnsContent } from '@/hooks/useArtistOwnership';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Calendar, Music, Eye, MessageSquare, Copy, Share2, User, Disc, Sparkles, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { LyricsSelector, LyricsSelection } from '@/components/LyricsSelector';

export default function SongDetail() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id || '0');
  const navigate = useNavigate();
  const [isRTL, setIsRTL] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [lyricsSelections, setLyricsSelections] = useState<LyricsSelection[]>([]);

  const { 
    data: songData, 
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['song', songId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/songs/${songId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch song');
      }
      return response.json();
    },
    enabled: !!songId,
  });

  const song = songData?.song;
  const artist = songData?.artist;
  const album = songData?.album;
  const comments = songData?.comments || [];
  
  const isOwned = useOwnsContent(song?.primary_artist_id);

  const loadComments = async () => {
    await refetch();
  };

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

  const handleTextSelection = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      setSelectedText(selection);
    }
  };

  const createCardWithSelection = () => {
    if (!song) return;
    
    const selection = window.getSelection()?.toString().trim();
    const lyrics = selection || selectedText;
    
    if (!lyrics) {
      toast.error('Please select some lyrics first!');
      return;
    }
    
    // Naviguer vers le créateur de carte avec les paramètres
    const params = new URLSearchParams({
      songId: song.id.toString(),
      artistId: song.primary_artist_id.toString(),
      artistName: song.primary_artist_name,
      songName: song.title,
      lyrics: lyrics.substring(0, 500) // Limiter à 500 caractères
    });
    
    navigate(`/tools/lyrics-card?${params.toString()}`);
    toast.success('Creating card with selected lyrics!');
  };

  const addToSelections = () => {
    if (!song) return;
    
    const selection = window.getSelection()?.toString().trim();
    const lyrics = selection || selectedText;
    
    if (!lyrics) {
      toast.error('Please select some lyrics first!');
      return;
    }

    const newSelection: LyricsSelection = {
      id: `selection-${Date.now()}-${Math.random()}`,
      text: lyrics.substring(0, 500),
      imageUrl: song.song_art_image_url || '',
      artistName: song.primary_artist_name,
      songName: song.title,
      artistId: song.primary_artist_id,
    };

    setLyricsSelections(prev => [...prev, newSelection]);
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
    toast.success('Lyrics added to selections!');
  };

  const removeSelection = (id: string) => {
    setLyricsSelections(prev => prev.filter(s => s.id !== id));
  };

  const updateSelectionImage = (id: string, imageUrl: string) => {
    setLyricsSelections(prev =>
      prev.map(s => s.id === id ? { ...s, imageUrl } : s)
    );
  };

  const openCardMakerWithSelections = () => {
    if (lyricsSelections.length === 0) return;
    
    // Pour l'instant, on ouvre avec la première sélection
    const first = lyricsSelections[0];
    const params = new URLSearchParams({
      songId: song?.id.toString() || '',
      artistId: song?.primary_artist_id.toString() || '',
      artistName: first.artistName,
      songName: first.songName,
      lyrics: first.text
    });
    
    navigate(`/tools/lyrics-card?${params.toString()}`);
  };

  const clearSelections = () => {
    setLyricsSelections([]);
    toast.success('All selections cleared!');
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
              <div className="flex items-center justify-between gap-4 mb-2">
                <h1 className="flex-1">{song.title}</h1>
                {isOwned && (
                  <EditButton
                    onClick={() => navigate(`/songs/${songId}/edit`)}
                    variant="default"
                    size="md"
                    showText={true}
                  />
                )}
              </div>
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
              <LikeButton
                contentType="song"
                contentId={song.id}
                showCount={true}
                variant="ghost"
                size="sm"
              />
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
                  <Button
                    variant="default"
                    size="sm"
                    onClick={createCardWithSelection}
                    className="gap-2 bg-gradient-primary"
                  >
                    <Sparkles className="w-4 h-4" />
                    Create Card
                  </Button>
                </div>
              </div>

              {song.instrumental ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>This is an instrumental track with no lyrics</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    className={`prose prose-invert max-w-none ${isRTL ? 'text-right' : ''} select-text cursor-text`}
                    dir={isRTL ? 'rtl' : 'ltr'}
                    onMouseUp={handleTextSelection}
                  >
                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                      {song.lyrics}
                    </pre>
                  </div>
                  
                  {selectedText && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 bg-primary/10 border border-primary/20 rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">Lyrics Selected</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedText.substring(0, 60)}{selectedText.length > 60 ? '...' : ''}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={addToSelections}
                          size="sm"
                          variant="outline"
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add to Queue
                        </Button>
                        <Button
                          onClick={createCardWithSelection}
                          size="sm"
                          className="bg-gradient-primary gap-2"
                        >
                          <Sparkles className="w-4 h-4" />
                          Create Card
                        </Button>
                      </div>
                    </motion.div>
                  )}
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

            {/* Comments Section */}
            <CommentSection
              type="song"
              itemId={song.id}
              itemName={song.title}
            />
          </div>
        </motion.div>
      </div>

      {/* Floating Lyrics Selector Panel */}
      <LyricsSelector
        selections={lyricsSelections}
        onRemove={removeSelection}
        onImageChange={updateSelectionImage}
        onCreateCards={openCardMakerWithSelections}
        onClear={clearSelections}
        artistId={song?.primary_artist_id || 0}
      />
    </div>
  );
}
