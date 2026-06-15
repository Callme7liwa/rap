import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followArtist, checkFollowingArtist } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';

interface FollowButtonProps {
  artistId: number;
  artistName?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showText?: boolean;
  className?: string;
}

export function FollowButton({
  artistId,
  artistName,
  variant = 'default',
  size = 'default',
  showText = true,
  className = ''
}: FollowButtonProps) {
  const { isAuthenticated, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check if following
  const { data: followStatus } = useQuery({
    queryKey: QUERY_KEYS.followStatus(artistId),
    queryFn: () => checkFollowingArtist(artistId),
    enabled: isAuthenticated && !isAdmin,
  });

  const isFollowing = followStatus?.following || false;

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => followArtist(artistId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.followStatus(artistId) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.followerCount(artistId) });
      queryClient.invalidateQueries({ queryKey: ['myFollowedArtists'] });
      
      if (data.action === 'followed') {
        toast.success(`Now following ${artistName || 'artist'}!`);
      } else {
        toast.info(`Unfollowed ${artistName || 'artist'}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update follow status');
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    followMutation.mutate();
  };

  if (isAdmin) {
    return null;
  }

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size={size}
        onClick={handleClick}
        className={`opacity-70 ${className}`}
      >
        <UserPlus className="w-4 h-4" />
        {showText && <span className="ml-2">FOLLOW</span>}
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : variant}
      size={size}
      onClick={handleClick}
      disabled={followMutation.isPending}
      className={className}
    >
      {followMutation.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <>
          <UserMinus className="w-4 h-4" />
          {showText && <span className="ml-2">Following</span>}
        </>
      ) : (
        <>
          <UserPlus className="w-4 h-4" />
          {showText && <span className="ml-2">Follow</span>}
        </>
      )}
    </Button>
  );
}
