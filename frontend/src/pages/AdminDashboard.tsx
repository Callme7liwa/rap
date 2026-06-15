import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getAdminDashboardStats } from '@/lib/api-client';
import type { AdminStats, CollabStatus, Role } from '@/lib/api-client';

const roleLabels: Role[] = ['USER', 'ARTIST', 'ADMIN'];
const collabStatusLabels: CollabStatus[] = [
  'PENDING',
  'PARTIALLY_APPROVED',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'COMPLETED',
];

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="bg-card border border-border rounded-none hover:shadow-hard transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="font-heading uppercase tracking-widest text-xs text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="font-display text-5xl text-primary">{value}</div>
      </CardContent>
    </Card>
  );
}

function DetailsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-card border border-border rounded-none">
      <CardHeader>
        <CardTitle className="font-heading uppercase tracking-widest text-xs text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">{children}</div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<AdminStats>({
    queryKey: ['adminDashboardStats'],
    queryFn: getAdminDashboardStats,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8">
        <Card className="bg-card border border-border rounded-none">
          <CardContent className="pt-6 text-destructive">
            Failed to load admin stats.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="font-display text-5xl uppercase tracking-wide">
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-2">
          Global platform management overview.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Users" value={stats.users.total} />
        <StatCard label="Total Artists" value={stats.artists.total} />
        <StatCard label="Total Songs" value={stats.songs.total} />
        <StatCard label="Total Albums" value={stats.albums.total} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Blog Posts"
          value={`${stats.blog.published} / ${stats.blog.total_posts}`}
        />
        <StatCard label="Poll Votes" value={stats.votes.total_poll_votes} />
        <StatCard label="Monthly Votes" value={stats.votes.total_monthly_votes} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <DetailsSection title="Users by role">
          {roleLabels.map((role) => (
            <Badge
              key={role}
              variant="secondary"
              className="rounded-none uppercase tracking-widest text-xs px-3 py-1"
            >
              {role}: {stats.users.by_role[role]}
            </Badge>
          ))}
        </DetailsSection>

        <DetailsSection title="Collab by status">
          {collabStatusLabels.map((status) => (
            <Badge
              key={status}
              variant="outline"
              className="rounded-none uppercase tracking-widest text-xs px-3 py-1"
            >
              {status}: {stats.collab_requests.by_status[status]}
            </Badge>
          ))}
        </DetailsSection>
      </div>
    </div>
  );
}
