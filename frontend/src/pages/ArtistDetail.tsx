import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { getArtistById, getArtistSongs, getArtistAlbums, getSongs, getArtistFollowerCount } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FollowButton } from '@/components/FollowButton';
import { QUERY_KEYS } from '@/lib/query-keys';
import { SongRow } from '@/components/SongRow';
import { AlbumCard } from '@/components/AlbumCard';
import { EditButton } from '@/components/EditButton';
import { RequestCollabForm } from '@/components/RequestCollabForm';
import { useOwnsArtist } from '@/hooks/useArtistOwnership';
import { Instagram, Twitter, Facebook, Users, Music, Disc, CheckCircle2, FileText, Loader2, Search, Handshake } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '@/store/auth.store';

export default function ArtistDetail() {
  const { id } = useParams<{ id: string }>();
  const artistId = parseInt(id || '0');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [songSearchQuery, setSongSearchQuery] = useState('');
  const [showCollabDialog, setShowCollabDialog] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const isOwned = useOwnsArtist(artistId);

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtistById(artistId),
    enabled: !!artistId,
  });

  // Détecter automatiquement si le texte contient de l'arabe, hébreu, ou autres langues RTL
  const isDescriptionRTL = useMemo(() => {
    if (!artist?.description_preview) return false;
    // Regex pour détecter les caractères arabes, hébreux, persan, etc.
    const rtlRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\u0590-\u05FF]/;
    return rtlRegex.test(artist.description_preview);
  }, [artist?.description_preview]);

  // Pagination infinie pour les chansons de l'artiste
  const {
    data: songsData,
    isLoading: songsLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage
  } = useInfiniteQuery({
    queryKey: ['artist-songs-infinite', artistId],
    queryFn: ({ pageParam }) => getSongs({
      artistId,
      limit: 20,
      cursor: pageParam
    }),
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    initialPageParam: undefined,
    enabled: !!artistId,
  });

  const { data: albums } = useQuery({
    queryKey: ['artist-albums', artistId],
    queryFn: () => getArtistAlbums(artistId),
    enabled: !!artistId,
  });

  // Get follower count for the artist
  const { data: followerData } = useQuery({
    queryKey: QUERY_KEYS.followerCount(artistId),
    queryFn: () => getArtistFollowerCount(artistId),
    enabled: !!artistId,
  });

  // Intersection Observer pour le chargement automatique des chansons
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
    return songsData?.pages.flatMap(page => page.data) || [];
  }, [songsData]);

  // Charger automatiquement toutes les chansons si une recherche est active
  useEffect(() => {
    if (songSearchQuery && hasNextPage && !isFetchingNextPage) {
      // Petit délai pour éviter trop de requêtes simultanées
      const timer = setTimeout(() => {
        fetchNextPage();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [songSearchQuery, hasNextPage, isFetchingNextPage, fetchNextPage, allSongs.length]);

  // Filtrer les chansons selon la recherche locale
  const filteredSongs = useMemo(() => {
    if (!songSearchQuery.trim()) return allSongs;

    const searchLower = songSearchQuery.toLowerCase();
    return allSongs.filter(song =>
      song.title.toLowerCase().includes(searchLower) ||
      song.full_title?.toLowerCase().includes(searchLower)
    );
  }, [allSongs, songSearchQuery]);

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
              <div className="w-32 h-32 rounded-none overflow-hidden border-4 border-background shadow-elevated flex-shrink-0">
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
                  <div className="flex items-center gap-2">
                    {isOwned && (
                      <EditButton
                        onClick={() => navigate(`/artists/${artistId}/edit`)}
                        variant="default"
                        size="md"
                        showText={true}
                      />
                    )}
                    {!isOwned && !isAdmin && (
                      <Dialog open={showCollabDialog} onOpenChange={setShowCollabDialog}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Handshake className="mr-2 h-4 w-4" />
                            Request Collab
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <RequestCollabForm
                            artistId={artistId}
                            artistName={artist.name}
                            onSuccess={() => setShowCollabDialog(false)}
                            onCancel={() => setShowCollabDialog(false)}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                    <FollowButton
                      artistId={artistId}
                      artistName={artist.name}
                      showText={true}
                      variant="default"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{followerData?.count || 0} followers</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Music className="w-4 h-4" />
                    <span className="font-medium">{allSongs.length} songs</span>
                  </div>
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
            <div className="glass rounded-none p-6">
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

            {/* Description Preview */}
            {artist.description_preview && (
              <div className="glass rounded-none p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-semibold">Biography</h3>
                </div>
                <div
                  className={`text-sm leading-relaxed ${
                    isDescriptionRTL ? 'text-right' : 'text-left'
                  }`}
                  dir={isDescriptionRTL ? 'rtl' : 'ltr'}
                >
                  <p className="text-muted-foreground whitespace-pre-line">
                    {showFullDescription
                      ? artist.description_preview
                      : artist.description_preview.length > 300
                      ? `${artist.description_preview.substring(0, 300)}...`
                      : artist.description_preview}
                  </p>
                  {artist.description_preview.length > 300 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="mt-3 text-primary hover:text-primary/80"
                    >
                      {showFullDescription ? 'Show Less' : 'Read More'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {(artist.instagram_name || artist.twitter_name || artist.facebook_name) && (
              <div className="glass rounded-none p-6">
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

            {/* All Songs - Pagination infinie */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Music className="w-6 h-6 text-primary" />
                  <h2 className="font-display text-2xl font-bold">
                    All Songs {filteredSongs.length > 0 && songSearchQuery ? `(${filteredSongs.length} of ${allSongs.length})` : allSongs.length > 0 ? `(${allSongs.length})` : ''}
                  </h2>
                </div>
              </div>

              {/* Barre de recherche */}
              {allSongs.length > 0 && (
                <div className="mb-6">
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search songs by title..."
                      value={songSearchQuery}
                      onChange={(e) => setSongSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {songSearchQuery && (
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-sm text-muted-foreground">
                        {filteredSongs.length === 0 ? 'No songs match your search' : `Found ${filteredSongs.length} song${filteredSongs.length !== 1 ? 's' : ''}`}
                      </p>
                      {hasNextPage && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading more...
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {songsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : allSongs.length === 0 ? (
                <div className="text-center py-12 glass rounded-none">
                  <Music className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No songs found for this artist</p>
                </div>
              ) : filteredSongs.length === 0 ? (
                <div className="text-center py-12 glass rounded-none">
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No songs match "{songSearchQuery}"</p>
                  <Button
                    variant="ghost"
                    onClick={() => setSongSearchQuery('')}
                    className="mt-3"
                  >
                    Clear search
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {filteredSongs.map((song, i) => (
                      <SongRow key={`${song.id}-${i}`} song={song} index={i} />
                    ))}
                  </div>

                  {/* Sentinel pour le chargement automatique - seulement si pas de recherche active */}
                  {!songSearchQuery && (
                    <div ref={loadMoreRef} className="py-6">
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
                          All songs loaded ({allSongs.length} total)
                        </p>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
