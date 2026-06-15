import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  LogOut,
  Music,
  Settings,
  Trophy,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/store/auth.store';

const adminLinks = [
  { to: '/admin', label: 'DASHBOARD', icon: LayoutDashboard, end: true },
  { to: '/admin/users', label: 'USERS', icon: Users },
  { to: '/admin/artists', label: 'ARTISTS', icon: Music },
  { to: '/admin/collab', label: 'COLLAB SETTINGS', icon: Settings },
  { to: '/admin/voting', label: 'CREATE POLL', icon: Trophy },
];

export function AdminSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sticky top-0 h-screen w-64 flex-shrink-0 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border space-y-3">
        <div className="font-display text-xl text-primary tracking-wider">
          LYRIC_SCAPE
        </div>
        <div className="inline-flex border border-border px-2 py-0.5 text-xs uppercase tracking-widest text-muted-foreground">
          ADMIN PANEL
        </div>
      </div>

      <nav className="flex-1 py-6">
        {adminLinks.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-6 py-3 uppercase tracking-widest text-xs font-heading border-l-2 transition-colors',
                  isActive
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-muted-foreground border-transparent hover:text-foreground',
                ].join(' ')
              }
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-6 border-t border-border space-y-4">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {user?.display_name || 'Admin'}
          </p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          onClick={handleLogout}
          className="w-full justify-start text-destructive hover:text-destructive uppercase text-xs rounded-none"
        >
          <LogOut className="h-4 w-4 mr-2" />
          LOGOUT
        </Button>
      </div>
    </aside>
  );
}
