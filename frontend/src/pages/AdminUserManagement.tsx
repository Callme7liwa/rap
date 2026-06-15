import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Search, Loader2, XCircle, Users, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  ApiRequestError,
  deleteAdminUser,
  getAdminUsers,
  updateAdminUserRole,
} from '@/lib/api-client';
import type { AdminUser, Role } from '@/lib/api-client';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useAuth } from '@/store/auth.store';
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

type RoleFilter = 'ALL' | Role;

const ROLE_OPTIONS: Role[] = ['USER', 'ARTIST', 'ADMIN'];
const PAGE_SIZE = 20;

export default function AdminUserManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedQ(q.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [q]);

  useEffect(() => {
    setPage(1);
  }, [roleFilter, debouncedQ]);

  const adminUsersKey = QUERY_KEYS.adminUsers(page, roleFilter, debouncedQ);

  const {
    data: usersData,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: adminUsersKey,
    queryFn: () =>
      getAdminUsers({
        page,
        limit: PAGE_SIZE,
        role: roleFilter === 'ALL' ? undefined : roleFilter,
        q: debouncedQ || undefined,
      }),
    retry: 1,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: Role }) => {
      return updateAdminUserRole(userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKey });
      toast.success('User role updated');
    },
    onError: (error: Error) => {
      if (error instanceof ApiRequestError && error.status === 403) {
        toast.error('Cannot change your own admin role');
        return;
      }

      toast.error('Failed to update role', { description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteAdminUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminUsersKey });
      toast.success('User deleted');
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete user', { description: error.message });
    },
  });

  const handleRoleChange = (userId: number, role: Role) => {
    if (userId === currentUser?.id) {
      toast.error('Cannot change your own admin role');
      return;
    }

    roleMutation.mutate({ userId, role });
  };

  const users = usersData?.data ?? [];
  const meta = usersData?.meta;
  const adminCount = users.filter((user) => user.role === 'ADMIN').length;
  const artistCount = users.filter((user) => user.role === 'ARTIST').length;
  const regularCount = users.filter((user) => user.role === 'USER').length;

  const confirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    deleteMutation.mutate(deleteTarget.id);
  };

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary/10 rounded-sm">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">User Management</h1>
              <p className="text-muted-foreground">Manage admin privileges and user roles</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Matching</p>
                    <p className="text-3xl font-bold">{meta?.total ?? 0}</p>
                  </div>
                  <Users className="w-10 h-10 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Admins On Page</p>
                    <p className="text-3xl font-bold text-primary">{adminCount}</p>
                  </div>
                  <Shield className="w-10 h-10 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Artists On Page</p>
                    <p className="text-3xl font-bold">{artistCount}</p>
                  </div>
                  <Users className="w-10 h-10 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Users On Page</p>
                    <p className="text-3xl font-bold">{regularCount}</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-3 py-1">
                    USER
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by email or display name..."
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  className="flex-1"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
                className="bg-secondary border border-border text-foreground uppercase text-xs rounded-none px-2 py-1"
              >
                <option value="ALL">ALL ROLES</option>
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            {isFetching && !isLoading && (
              <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                Refreshing users...
              </p>
            )}
          </CardContent>
        </Card>

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
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {debouncedQ || roleFilter !== 'ALL'
                    ? 'No users found matching your filters'
                    : 'No users found'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const isSelf = user.id === currentUser?.id;
                      
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span>#{user.id}</span>
                              {isSelf && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p>{user.email}</p>
                              {user.display_name && (
                                <p className="text-xs text-muted-foreground">
                                  {user.display_name}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <select
                              value={user.role}
                              onChange={(event) =>
                                handleRoleChange(user.id, event.target.value as Role)
                              }
                              disabled={isSelf || roleMutation.isPending}
                              title={isSelf ? 'Cannot change your own role' : undefined}
                              className="bg-secondary border border-border text-foreground uppercase text-xs rounded-none px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>
                                  {role}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell>
                            {user.artist ? (
                              <Badge variant="secondary">{user.artist.name}</Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {user.created_at ? 
                              new Date(user.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              }) 
                              : 'N/A'
                            }
                          </TableCell>
                          <TableCell className="text-right">
                            {!isSelf && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTarget(user)}
                                disabled={deleteMutation.isPending}
                                className="border border-destructive text-destructive rounded-none uppercase text-xs hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
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

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Page {meta?.page ?? page} of {meta?.total_pages ?? 1} · {meta?.total ?? 0} users
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                  disabled={isLoading || page <= 1}
                  className="rounded-none uppercase text-xs"
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((currentPage) => currentPage + 1)}
                  disabled={isLoading || !meta?.hasNextPage}
                  className="rounded-none uppercase text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this user?</DialogTitle>
              <DialogDescription>
                Delete this user? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
