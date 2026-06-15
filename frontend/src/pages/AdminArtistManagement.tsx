import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getArtistUserAssociations, 
  associateArtistWithUser, 
  removeArtistAssociation,
  searchAdminUsers,
  getAdminStats,
  getArtists,
  getAdminGeniusProfile,
  previewAdminGeniusArtist,
  syncAdminGeniusArtist,
  GeniusArtistPreview,
} from '@/lib/api';
import { useAuth } from '@/store/auth.store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Shield, 
  Users, 
  Link as LinkIcon, 
  Trash2, 
  Search, 
  Music,
  CheckCircle2,
  AlertCircle,
  UserCircle,
  ArrowRight,
  Sparkles,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminArtistManagement() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [enrichmentArtistId, setEnrichmentArtistId] = useState<number | null>(null);
  const [geniusUrl, setGeniusUrl] = useState('');
  const [geniusPreview, setGeniusPreview] = useState<GeniusArtistPreview | null>(null);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [debouncedUserSearchQuery, setDebouncedUserSearchQuery] = useState('');

  const isLoggedIn = isAuthenticated;
  const canSearchUsers = debouncedUserSearchQuery.length >= 2;

  const { data: stats } = useQuery({
    queryKey: ['adminStats'],
    queryFn: getAdminStats,
    enabled: isLoggedIn,
  });

  const { data: associationsData, isLoading: associationsLoading } = useQuery({
    queryKey: ['artistAssociations'],
    queryFn: getArtistUserAssociations,
    enabled: isLoggedIn,
  });

  const { data: artistsData, isLoading: artistsLoading } = useQuery({
    queryKey: ['artists', artistSearchQuery],
    queryFn: () => getArtists({ query: artistSearchQuery, page: 1, limit: 100 }),
    enabled: isLoggedIn,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUserSearch', debouncedUserSearchQuery],
    queryFn: () => searchAdminUsers(debouncedUserSearchQuery),
    enabled: isLoggedIn && canSearchUsers,
  });

  const { data: geniusProfile } = useQuery({
    queryKey: ['adminGeniusProfile', enrichmentArtistId],
    queryFn: () => getAdminGeniusProfile(enrichmentArtistId as number),
    enabled: isLoggedIn && enrichmentArtistId !== null,
  });

  useEffect(() => {
    setGeniusPreview(null);
    setGeniusUrl(geniusProfile?.url ?? '');
  }, [enrichmentArtistId, geniusProfile?.url]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedUserSearchQuery(userSearchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [userSearchQuery]);

  const associateMutation = useMutation({
    mutationFn: ({ artistId, userId }: { artistId: number; userId: number }) =>
      associateArtistWithUser(artistId, userId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Artist successfully associated with user!');
        queryClient.invalidateQueries({ queryKey: ['artistAssociations'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        setSelectedArtistId(null);
        setSelectedUserId(null);
      } else {
        toast.error(data.error || 'Failed to create association');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create association');
    },
  });

  const removeMutation = useMutation({
    mutationFn: (artistId: number) => removeArtistAssociation(artistId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Association removed successfully!');
        queryClient.invalidateQueries({ queryKey: ['artistAssociations'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
      } else {
        toast.error(data.error || 'Failed to remove association');
      }
    },
  });

  const previewGeniusMutation = useMutation({
    mutationFn: ({ artistId, url }: { artistId: number; url: string }) =>
      previewAdminGeniusArtist(artistId, url),
    onSuccess: (data) => {
      setGeniusPreview(data);
      toast.success('Genius artist preview loaded');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to preview Genius artist');
    },
  });

  const syncGeniusMutation = useMutation({
    mutationFn: ({ artistId, url }: { artistId: number; url: string }) =>
      syncAdminGeniusArtist(artistId, url),
    onSuccess: (data) => {
      setGeniusPreview(data.preview);
      toast.success(
        `Artist enriched: ${data.imported.albums_created + data.imported.albums_updated} albums, ${data.imported.songs_created + data.imported.songs_updated} songs, ${data.imported.lyrics_imported} lyrics synced`,
      );
      queryClient.invalidateQueries({ queryKey: ['artists'] });
      queryClient.invalidateQueries({ queryKey: ['albums'] });
      queryClient.invalidateQueries({ queryKey: ['songs'] });
      queryClient.invalidateQueries({ queryKey: ['adminGeniusProfile'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to sync Genius artist');
    },
  });

  const handleAssociate = () => {
    if (!selectedArtistId) {
      toast.error('Please select an artist');
      return;
    }
    if (!selectedUserId) {
      toast.error('Please select a user');
      return;
    }

    associateMutation.mutate({ artistId: selectedArtistId, userId: selectedUserId });
  };

  const handlePreviewGenius = () => {
    if (!enrichmentArtistId) {
      toast.error('Please select an artist to enrich');
      return;
    }

    if (!geniusUrl.trim()) {
      toast.error('Please paste a Genius artist URL');
      return;
    }

    previewGeniusMutation.mutate({
      artistId: enrichmentArtistId,
      url: geniusUrl.trim(),
    });
  };

  const handleSyncGenius = () => {
    if (!enrichmentArtistId) {
      toast.error('Please select an artist to enrich');
      return;
    }

    if (!geniusUrl.trim()) {
      toast.error('Please paste a Genius artist URL');
      return;
    }

    syncGeniusMutation.mutate({
      artistId: enrichmentArtistId,
      url: geniusUrl.trim(),
    });
  };

  // Filter artists and users by search
  const filteredArtists = artistsData?.data.filter(artist =>
    artist.name.toLowerCase().includes(artistSearchQuery.toLowerCase())
  ) || [];

  const userSearchResults = canSearchUsers ? usersData?.data ?? [] : [];

  // Get associated artist and user IDs
  const associatedArtistIds = new Set(associationsData?.associations.map(a => a.artist.id) || []);
  const associatedUserIds = new Set(
    associationsData?.associations
      .map(a => a.user?.id)
      .filter((id): id is number => typeof id === 'number') || [],
  );

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-6 h-6" />
              <CardTitle>Access Denied</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p>You must be logged in to access this page.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedArtist = filteredArtists.find(a => a.id === selectedArtistId);
  const selectedUser = userSearchResults.find(u => u.id === selectedUserId);
  const enrichmentArtist = artistsData?.data.find(a => a.id === enrichmentArtistId);

  return (
    <div className="min-h-screen py-8 bg-background">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Admin Panel</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Associate artists with user accounts to let them manage their profiles
          </p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid gap-4 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Artists</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.total_artists}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Associated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{stats.associated_artists}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Unassociated</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-600">{stats.unassociated_artists}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Selection Panel */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create Association</CardTitle>
            <CardDescription>Select an artist and a user, then click "Associate"</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              {/* Selected Artist */}
              <div className="flex-1">
                {selectedArtist ? (
                  <div className="flex items-center gap-3 p-4 border rounded-lg bg-primary/5">
                    <img
                      src={selectedArtist.image_url}
                      alt={selectedArtist.name}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{selectedArtist.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedArtist.followers_count?.toLocaleString()} followers
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedArtistId(null)}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg text-muted-foreground">
                    <div className="text-center">
                      <Music className="w-8 h-8 mx-auto mb-1" />
                      <p className="text-sm">Select an artist</p>
                    </div>
                  </div>
                )}
              </div>

              <ArrowRight className="w-8 h-8 text-muted-foreground flex-shrink-0" />

              {/* Selected User */}
              <div className="flex-1">
                {selectedUser ? (
                  <div className="flex items-center gap-3 p-4 border rounded-lg bg-primary/5">
                    <UserCircle className="w-16 h-16 text-primary" />
                    <div className="flex-1">
                      <p className="font-semibold text-lg">{selectedUser.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="default" className="text-xs">Active</Badge>
                        <Badge variant="outline" className="text-xs">
                          {selectedUser.role}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUserId(null)}
                    >
                      Clear
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-24 border-2 border-dashed rounded-lg text-muted-foreground">
                    <div className="text-center">
                      <UserCircle className="w-8 h-8 mx-auto mb-1" />
                      <p className="text-sm">Select a user</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full mt-6"
              size="lg"
              onClick={handleAssociate}
              disabled={!selectedArtistId || !selectedUserId || associateMutation.isPending}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              {associateMutation.isPending ? 'Creating Association...' : 'Associate Artist with User'}
            </Button>
          </CardContent>
        </Card>

        {/* Genius Enrichment */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <CardTitle>Genius Enrichment</CardTitle>
            </div>
            <CardDescription>
              Admin-only tool to attach a Genius artist link and sync trusted metadata, albums, songs, and lyrics into LyricsScape.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="genius-artist">
                  Artist
                </label>
                <select
                  id="genius-artist"
                  value={enrichmentArtistId ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setEnrichmentArtistId(value ? Number(value) : null);
                  }}
                  className="h-10 w-full border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select artist...</option>
                  {(artistsData?.data ?? []).map((artist) => (
                    <option key={artist.id} value={artist.id}>
                      {artist.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="genius-url">
                  Genius artist URL
                </label>
                <Input
                  id="genius-url"
                  placeholder="https://genius.com/artists/Dizzy-dros"
                  value={geniusUrl}
                  onChange={(event) => {
                    setGeniusUrl(event.target.value);
                    setGeniusPreview(null);
                  }}
                />
              </div>
            </div>

            {geniusProfile && (
              <div className="text-sm text-muted-foreground">
                Current Genius source:{' '}
                <a
                  href={geniusProfile.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  {geniusProfile.url}
                </a>
                {geniusProfile.last_synced_at && (
                  <span>
                    {' '}
                    · Last synced{' '}
                    {new Date(geniusProfile.last_synced_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={handlePreviewGenius}
                disabled={!enrichmentArtistId || !geniusUrl.trim() || previewGeniusMutation.isPending}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                {previewGeniusMutation.isPending ? 'Loading Preview...' : 'Preview Genius Data'}
              </Button>
              <Button
                onClick={handleSyncGenius}
                disabled={!enrichmentArtistId || !geniusUrl.trim() || syncGeniusMutation.isPending}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {syncGeniusMutation.isPending ? 'Syncing Catalog...' : 'Sync Artist Catalog'}
              </Button>
            </div>

            {geniusPreview && (
              <div className="border bg-card p-4">
                <div className="flex flex-col gap-4 md:flex-row">
                  <img
                    src={geniusPreview.image_url || enrichmentArtist?.image_url || '/placeholder.svg'}
                    alt={geniusPreview.name}
                    className="h-24 w-24 object-cover border"
                  />
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-3xl uppercase tracking-wide">
                          {geniusPreview.name}
                        </h3>
                        {geniusPreview.is_verified && (
                          <Badge variant="default">Verified on Genius</Badge>
                        )}
                        {geniusPreview.likely_moroccan && (
                          <Badge variant="secondary">Likely Moroccan</Badge>
                        )}
                        {geniusPreview.has_arabic && (
                          <Badge variant="outline">Arabic text</Badge>
                        )}
                      </div>
                      <a
                        href={geniusPreview.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {geniusPreview.url}
                      </a>
                    </div>

                    <div className="grid gap-2 text-sm md:grid-cols-3">
                      <div>
                        <p className="text-muted-foreground">Followers</p>
                        <p>{geniusPreview.followers_count?.toLocaleString() ?? 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">IQ</p>
                        <p>{geniusPreview.iq?.toLocaleString() ?? 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Socials</p>
                        <p>
                          {[geniusPreview.instagram, geniusPreview.twitter]
                            .filter(Boolean)
                            .join(' / ') || 'None found'}
                        </p>
                      </div>
                    </div>

                    {geniusPreview.description_preview && (
                      <p className="text-sm text-muted-foreground">
                        {geniusPreview.description_preview}
                      </p>
                    )}

                    {geniusPreview.alternate_names.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {geniusPreview.alternate_names.map((name) => (
                          <Badge key={name} variant="outline">
                            {name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Artists List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                <CardTitle>Artists</CardTitle>
              </div>
              <CardDescription>Select an artist to associate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search artists..."
                  value={artistSearchQuery}
                  onChange={(e) => setArtistSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                {artistsLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : filteredArtists.length === 0 ? (
                  <p className="p-8 text-sm text-muted-foreground text-center">No artists found</p>
                ) : (
                  filteredArtists.map((artist) => {
                    const isAssociated = associatedArtistIds.has(artist.id);
                    const isSelected = selectedArtistId === artist.id;
                    
                    return (
                      <div
                        key={artist.id}
                        className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                        } ${isAssociated ? 'opacity-50' : ''}`}
                        onClick={() => !isAssociated && setSelectedArtistId(artist.id)}
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={artist.image_url}
                            alt={artist.name}
                            className="w-12 h-12 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{artist.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {artist.followers_count?.toLocaleString()} followers
                            </p>
                          </div>
                          {isAssociated && (
                            <Badge variant="secondary" className="text-xs">
                              Associated
                            </Badge>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <CardTitle>Users</CardTitle>
              </div>
              <CardDescription>Select a user to associate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              
              <div className="border rounded-lg max-h-[500px] overflow-y-auto">
                {!canSearchUsers ? (
                  <div className="p-8 text-center">
                    <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Type at least 2 characters to search users
                    </p>
                  </div>
                ) : usersLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : userSearchResults.length === 0 ? (
                  <div className="p-8 text-center">
                    <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                      No users match your search
                    </p>
                  </div>
                ) : (
                  userSearchResults.map((user) => {
                    const isAssociated = associatedUserIds.has(user.id);
                    const isSelected = selectedUserId === user.id;
                    
                    return (
                      <div
                        key={user.id}
                        className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                        } ${isAssociated ? 'opacity-50' : ''}`}
                        onClick={() => !isAssociated && setSelectedUserId(user.id)}
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle className="w-12 h-12 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="default" className="text-xs">Active</Badge>
                            </div>
                          </div>
                          {isAssociated && (
                            <Badge variant="secondary" className="text-xs">
                              Associated
                            </Badge>
                          )}
                          {isSelected && (
                            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Current Associations */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <div className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5" />
                <CardTitle>Associations</CardTitle>
              </div>
              <CardDescription>Current artist-user links</CardDescription>
            </CardHeader>
            <CardContent>
              {associationsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : associationsData?.associations.length === 0 ? (
                <div className="text-center py-8">
                  <LinkIcon className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">No associations yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {associationsData?.associations.map((assoc) => (
                    <div
                      key={assoc.artist.id}
                      className="p-4 border rounded-lg flex items-start justify-between hover:bg-accent"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {assoc.artist && (
                          <img
                            src={assoc.artist.image_url}
                            alt={assoc.artist.name}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium">{assoc.artist?.name || 'Unknown'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <ArrowRight className="w-3 h-3 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground truncate">{assoc.user?.email}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Linked user role: {assoc.user?.role}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => removeMutation.mutate(assoc.artist.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
