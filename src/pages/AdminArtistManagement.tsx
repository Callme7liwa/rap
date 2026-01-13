import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { 
  getArtistUserAssociations, 
  associateArtistWithUser, 
  removeArtistAssociation,
  getAllCognitoUsers,
  getAdminStats,
  getArtists
} from '@/lib/api';
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
  ArrowRight
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminArtistManagement() {
  const { user } = useAuthenticator((context) => [context.user]);
  const queryClient = useQueryClient();
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [artistSearchQuery, setArtistSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Debug: log user object to see what's available
  console.log('[AdminPanel] User object:', user);
  console.log('[AdminPanel] userId:', user?.userId);
  console.log('[AdminPanel] username:', user?.username);

  // For Google login, we have userId which is the Cognito 'sub'
  // The backend will check if this user is in the admin group
  // So we just allow access if user is logged in, backend will enforce admin check
  const isLoggedIn = !!user?.userId;

  console.log('[AdminPanel] Is logged in:', isLoggedIn);
  console.log('[AdminPanel] Will attempt API calls (backend will enforce admin)');

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
    queryKey: ['cognitoUsers'],
    queryFn: () => getAllCognitoUsers(60),
    enabled: isLoggedIn,
  });

  const associateMutation = useMutation({
    mutationFn: ({ artistId, email }: { artistId: number; email: string }) =>
      associateArtistWithUser(artistId, email),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Artist successfully associated with user!');
        queryClient.invalidateQueries({ queryKey: ['artistAssociations'] });
        queryClient.invalidateQueries({ queryKey: ['adminStats'] });
        setSelectedArtistId(null);
        setSelectedUserEmail(null);
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

  const handleAssociate = () => {
    if (!selectedArtistId) {
      toast.error('Please select an artist');
      return;
    }
    if (!selectedUserEmail) {
      toast.error('Please select a user');
      return;
    }

    associateMutation.mutate({ artistId: selectedArtistId, email: selectedUserEmail });
  };

  // Filter artists and users by search
  const filteredArtists = artistsData?.data.filter(artist =>
    artist.name.toLowerCase().includes(artistSearchQuery.toLowerCase())
  ) || [];

  const filteredUsers = usersData?.users.filter(user =>
    user.email?.toLowerCase().includes(userSearchQuery.toLowerCase())
  ) || [];

  // Get associated artist and user IDs
  const associatedArtistIds = new Set(associationsData?.associations.map(a => a.artist_id) || []);
  const associatedUserEmails = new Set(associationsData?.associations.map(a => a.email) || []);

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
  const selectedUser = filteredUsers.find(u => u.email === selectedUserEmail);

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
                        <Badge variant={selectedUser.email_verified ? 'default' : 'secondary'} className="text-xs">
                          {selectedUser.email_verified ? 'Verified' : 'Not verified'}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {selectedUser.status}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUserEmail(null)}
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
              disabled={!selectedArtistId || !selectedUserEmail || associateMutation.isPending}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              {associateMutation.isPending ? 'Creating Association...' : 'Associate Artist with User'}
            </Button>
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
                {usersLoading ? (
                  <div className="p-4 space-y-2">
                    {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="p-8 text-center">
                    <UserCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                      {userSearchQuery ? 'No users match your search' : 'No users found in Cognito'}
                    </p>
                    {!userSearchQuery && (
                      <p className="text-xs text-muted-foreground">
                        Users need to sign up at the app first
                      </p>
                    )}
                  </div>
                ) : (
                  filteredUsers.map((user) => {
                    const isAssociated = associatedUserEmails.has(user.email);
                    const isSelected = selectedUserEmail === user.email;
                    
                    return (
                      <div
                        key={user.user_id}
                        className={`p-3 border-b last:border-b-0 cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent'
                        } ${isAssociated ? 'opacity-50' : ''}`}
                        onClick={() => !isAssociated && setSelectedUserEmail(user.email)}
                      >
                        <div className="flex items-center gap-3">
                          <UserCircle className="w-12 h-12 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={user.email_verified ? 'default' : 'secondary'} className="text-xs">
                                {user.email_verified ? 'Verified' : 'Not verified'}
                              </Badge>
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
                      key={assoc.artist_id}
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
                            <p className="text-sm text-muted-foreground truncate">{assoc.email}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(assoc.associated_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => removeMutation.mutate(assoc.artist_id)}
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
