import { Link, useLocation } from 'react-router-dom';
import { Music, Users, Disc, ListMusic, Wand2, Search, Moon, Sun, Cloud, Vote, BookOpen, LogIn, LogOut, User, Upload, Activity, Shield, UserCog, Handshake, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { signOut, fetchAuthSession } from 'aws-amplify/auth';
import { useArtistOwnership } from '@/hooks/useArtistOwnership';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const publicNavItems = [
  { to: '/', label: 'Home', icon: Music },
  { to: '/artists', label: 'Artists', icon: Users },
  { to: '/albums', label: 'Albums', icon: Disc },
  { to: '/songs', label: 'Songs', icon: ListMusic },
  { to: '/voting', label: 'Voting', icon: Vote },
  { to: '/blog', label: 'Blog', icon: BookOpen },
  { to: '/tools/lyrics-card', label: 'Card Maker', icon: Wand2 },
];

const adminNavItems = [
  { to: '/tools/s3-manager', label: 'S3 Manager', icon: Cloud, adminOnly: true },
];

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuthenticator((context) => [context.user]);
  const { data: artistOwnership } = useArtistOwnership();
  
  // Check if user is associated with an artist
  const isArtist = !!artistOwnership?.artist;

  useEffect(() => {
    // Set dark mode by default
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (user) {
        try {
          const session = await fetchAuthSession();
          const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] | undefined;
          setIsAdmin(groups?.includes('admin') || false);
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Combine nav items based on admin status
  const navItems = [...publicNavItems, ...(isAdmin ? adminNavItems : [])];

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <nav className="sticky top-0 z-50 glass border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Music className="w-8 h-8 text-primary" />
            <span className="font-display text-xl font-bold text-gradient">LyricsHub</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link key={item.to} to={item.to}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <form onSubmit={handleSearch} className="hidden sm:flex items-center gap-2">
              <Input
                type="search"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 lg:w-64"
              />
              <Button type="submit" size="icon" variant="ghost">
                <Search className="w-4 h-4" />
              </Button>
            </form>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>

            {/* Auth buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <User className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    {user.signInDetails?.loginId || 'My Account'}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/user/profile')}>
                    <User className="w-4 h-4 mr-2" />
                    My Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/user/activity')}>
                    <Activity className="w-4 h-4 mr-2" />
                    My Activity
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/my-uploads')}>
                    <Upload className="w-4 h-4 mr-2" />
                    My Uploads
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/voting/my-votes')}>
                    <Vote className="w-4 h-4 mr-2" />
                    My Votes
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/my-collab-requests')}>
                    <Handshake className="w-4 h-4 mr-2" />
                    My Collab Requests
                  </DropdownMenuItem>
                  {isArtist && (
                    <DropdownMenuItem onClick={() => navigate('/collab-requests')}>
                      <Bell className="w-4 h-4 mr-2" />
                      Artist Requests
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuLabel className="text-primary">
                        Admin
                      </DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigate('/admin/artist-management')}>
                        <Shield className="w-4 h-4 mr-2" />
                        Artist Management
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/user-management')}>
                        <UserCog className="w-4 h-4 mr-2" />
                        User Management
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/collab-settings')}>
                        <Settings className="w-4 h-4 mr-2" />
                        Collab Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/tools/s3-manager')}>
                        <Cloud className="w-4 h-4 mr-2" />
                        S3 Manager
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/voting/create')}>
                        <Vote className="w-4 h-4 mr-2" />
                        Create Voting Event
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/blog/create')}>
                    Create Post
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/voting')}>
                    Voting
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate('/login')}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Sign In
              </Button>
            )}
          </div>
        </div>

        {/* Mobile search */}
        <form onSubmit={handleSearch} className="sm:hidden pb-3 flex gap-2">
          <Input
            type="search"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Button type="submit" size="icon" variant="ghost">
            <Search className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </nav>
  );
}
