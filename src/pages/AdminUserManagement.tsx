import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, UserPlus, UserMinus, Search, Loader2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';
import { fetchAuthSession } from 'aws-amplify/auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CognitoUser {
  username: string;
  email?: string;
  enabled: boolean;
  userStatus: string;
  groups?: string[];
  createdAt: string;
  lastModified: string;
  identities?: Array<{
    providerName: string;
    providerType: string;
  }>;
}

interface DuplicateEmailGroup {
  email: string;
  users: CognitoUser[];
  count: number;
}

export default function AdminUserManagement() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<CognitoUser | null>(null);
  const [actionType, setActionType] = useState<'add' | 'remove' | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDuplicatesOnly, setShowDuplicatesOnly] = useState(false);

  // Fetch all users
  const { data: usersData, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/admin/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch users' }));
        throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    },
    retry: 1,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });

  // Add user to admin group mutation
  const addAdminMutation = useMutation({
    mutationFn: async (username: string) => {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const apiUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/admin/users/${username}/add-to-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add user to admin');
      }

      return response.json();
    },
    onSuccess: (data, username) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Admin Added', {
        description: `${username} has been added to the admin group.`,
      });
      setShowConfirmDialog(false);
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to Add Admin', {
        description: error.message,
      });
    },
  });

  // Remove user from admin group mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (username: string) => {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      const apiUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';
      const response = await fetch(`${apiUrl}/admin/users/${username}/remove-from-admin`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove user from admin');
      }

      return response.json();
    },
    onSuccess: (data, username) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Admin Removed', {
        description: `${username} has been removed from the admin group.`,
      });
      setShowConfirmDialog(false);
      setSelectedUser(null);
      setActionType(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to Remove Admin', {
        description: error.message,
      });
    },
  });

  // Auto-merge duplicate accounts mutation
  const mergeDuplicatesMutation = useMutation({
    mutationFn: async () => {
      console.log('🔄 Starting merge duplicates...');
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();

      if (!token) {
        console.error('❌ No token found');
        throw new Error('No authentication token');
      }

      const apiUrl = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';
      const url = `${apiUrl}/admin/merge-duplicates`;
      console.log('📡 Calling:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error response:', error);
        throw new Error(error.error || 'Failed to merge duplicates');
      }

      const data = await response.json();
      console.log('✅ Success:', data);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('Duplicates Merged', {
        description: `Successfully merged ${data.mergedCount} duplicate account(s). Secondary accounts have been disabled.`,
      });
    },
    onError: (error: Error) => {
      console.error('❌ Mutation error:', error);
      toast.error('Failed to Merge Duplicates', {
        description: error.message,
      });
    },
  });

  const handleAddAdmin = (user: CognitoUser) => {
    setSelectedUser(user);
    setActionType('add');
    setShowConfirmDialog(true);
  };

  const handleRemoveAdmin = (user: CognitoUser) => {
    setSelectedUser(user);
    setActionType('remove');
    setShowConfirmDialog(true);
  };

  const handleConfirm = () => {
    if (!selectedUser) return;

    if (actionType === 'add') {
      addAdminMutation.mutate(selectedUser.username);
    } else if (actionType === 'remove') {
      removeAdminMutation.mutate(selectedUser.username);
    }
  };

  const users = usersData?.users || [];
  const disabledCount = usersData?.disabledCount || 0;
  const adminUsers = users.filter((user: CognitoUser) => user.groups?.includes('admin') || false);
  const regularUsers = users.filter((user: CognitoUser) => !user.groups?.includes('admin'));

  // Detect duplicate emails
  const emailMap = new Map<string, CognitoUser[]>();
  users.forEach((user: CognitoUser) => {
    if (user.email) {
      const existing = emailMap.get(user.email) || [];
      existing.push(user);
      emailMap.set(user.email, existing);
    }
  });

  const duplicateEmails: DuplicateEmailGroup[] = Array.from(emailMap.entries())
    .filter(([_, users]) => users.length > 1)
    .map(([email, users]) => ({
      email,
      users,
      count: users.length
    }))
    .sort((a, b) => b.count - a.count);

  const duplicateUsernames = new Set(
    duplicateEmails.flatMap(group => group.users.map(u => u.username))
  );

  // Filter users based on search and duplicate filter
  let filteredUsers = users.filter((user: CognitoUser) =>
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (showDuplicatesOnly) {
    filteredUsers = filteredUsers.filter(user => duplicateUsernames.has(user.username));
  }

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">User Management</h1>
              <p className="text-muted-foreground">Manage admin privileges and user roles</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Users</p>
                    <p className="text-3xl font-bold">{users.length}</p>
                  </div>
                  <Users className="w-10 h-10 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Admin Users</p>
                    <p className="text-3xl font-bold text-primary">{adminUsers.length}</p>
                  </div>
                  <Shield className="w-10 h-10 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Regular Users</p>
                    <p className="text-3xl font-bold">{regularUsers.length}</p>
                  </div>
                  <Users className="w-10 h-10 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className={duplicateEmails.length > 0 ? "border-destructive/50 cursor-pointer hover:bg-destructive/5" : ""}
              onClick={() => duplicateEmails.length > 0 && setShowDuplicatesOnly(!showDuplicatesOnly)}
            >
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Duplicate Emails</p>
                    <p className={`text-3xl font-bold ${duplicateEmails.length > 0 ? 'text-destructive' : ''}`}>
                      {duplicateEmails.length}
                    </p>
                  </div>
                  <Badge variant={duplicateEmails.length > 0 ? "destructive" : "secondary"} className="text-lg px-3 py-1">
                    {duplicateUsernames.size} users
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Disabled accounts info */}
          {disabledCount > 0 && (
            <div className="mt-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {disabledCount} disabled account(s) hidden (merged duplicates). These accounts are no longer active.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Duplicate Warning Banner */}
          {duplicateEmails.length > 0 && (
            <Card className="mt-4 border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-destructive mb-2">Duplicate Accounts Detected</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Found {duplicateEmails.length} email(s) with multiple accounts ({duplicateUsernames.size} total users affected). 
                      This can cause confusion and data inconsistencies.
                    </p>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant={showDuplicatesOnly ? "default" : "outline"}
                        onClick={() => setShowDuplicatesOnly(!showDuplicatesOnly)}
                      >
                        {showDuplicatesOnly ? 'Show All Users' : 'Show Only Duplicates'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          console.log('🔘 Button clicked!');
                          mergeDuplicatesMutation.mutate();
                        }}
                        disabled={mergeDuplicatesMutation.isPending}
                      >
                        {mergeDuplicatesMutation.isPending && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Auto-Merge Duplicates
                      </Button>
                    </div>
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground">Affected Emails:</p>
                      {duplicateEmails.slice(0, 3).map(group => (
                        <p key={group.email} className="text-xs text-muted-foreground">
                          • {group.email} ({group.count} accounts)
                        </p>
                      ))}
                      {duplicateEmails.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          • and {duplicateEmails.length - 3} more...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users</CardTitle>
            <CardDescription>
              Manage user roles and admin privileges
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="ml-3 text-muted-foreground">Loading users...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">Failed to Load Users</p>
                <p className="text-muted-foreground mb-4">
                  {(error as Error).message || 'An error occurred while fetching users'}
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  <Loader2 className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No users found matching your search' : 'No users found'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: CognitoUser) => {
                      const isAdmin = user.groups?.includes('admin') || false;
                      const isDuplicate = duplicateUsernames.has(user.username);
                      const duplicateGroup = isDuplicate ? duplicateEmails.find(g => g.users.some(u => u.username === user.username)) : null;
                      const isGoogleUser = user.username.startsWith('Google_');
                      
                      return (
                        <TableRow key={user.username} className={isDuplicate ? 'bg-destructive/5' : ''}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>{user.username}</span>
                              {isGoogleUser && (
                                <Badge variant="outline" className="text-xs">
                                  Google
                                </Badge>
                              )}
                              {isDuplicate && (
                                <Badge variant="destructive" className="text-xs">
                                  Duplicate
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span>{user.email || 'N/A'}</span>
                              {duplicateGroup && duplicateGroup.count > 1 && (
                                <Badge variant="outline" className="text-xs">
                                  {duplicateGroup.count}x
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.enabled ? (
                              <Badge variant="default" className="gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="gap-1">
                                <XCircle className="w-3 h-3" />
                                Disabled
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {isAdmin ? (
                              <Badge variant="default" className="gap-1 bg-primary">
                                <Shield className="w-3 h-3" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="secondary">User</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.createdAt ? 
                              new Date(user.createdAt).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) 
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {isAdmin ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveAdmin(user)}
                                disabled={removeAdminMutation.isPending}
                                className="text-destructive hover:text-destructive"
                              >
                                <UserMinus className="w-4 h-4 mr-2" />
                                Remove Admin
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddAdmin(user)}
                                disabled={addAdminMutation.isPending}
                                className="text-primary hover:text-primary"
                              >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Make Admin
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Confirmation Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'add' ? 'Add Admin Privileges' : 'Remove Admin Privileges'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'add' ? (
                  <>
                    Are you sure you want to grant admin privileges to{' '}
                    <span className="font-semibold text-foreground">{selectedUser?.username}</span>?
                    <br />
                    <br />
                    This will give them full access to:
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Artist management</li>
                      <li>User management</li>
                      <li>S3 file manager</li>
                      <li>Voting event creation</li>
                      <li>All admin features</li>
                    </ul>
                  </>
                ) : (
                  <>
                    Are you sure you want to remove admin privileges from{' '}
                    <span className="font-semibold text-foreground">{selectedUser?.username}</span>?
                    <br />
                    <br />
                    They will lose access to all admin features.
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowConfirmDialog(false);
                  setSelectedUser(null);
                  setActionType(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant={actionType === 'add' ? 'default' : 'destructive'}
                onClick={handleConfirm}
                disabled={addAdminMutation.isPending || removeAdminMutation.isPending}
              >
                {(addAdminMutation.isPending || removeAdminMutation.isPending) ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : actionType === 'add' ? (
                  <UserPlus className="w-4 h-4 mr-2" />
                ) : (
                  <UserMinus className="w-4 h-4 mr-2" />
                )}
                {actionType === 'add' ? 'Grant Admin Access' : 'Remove Admin Access'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
