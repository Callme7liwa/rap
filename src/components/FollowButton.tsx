import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { followArtist, checkFollowingArtist } from '@/lib/api';
import { toast } from 'sonner';

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
  const { user } = useAuthenticator((context) => [context.user]);
  const queryClient = useQueryClient();
  const isAuthenticated = !!user;

  // Check if following
  const { data: followStatus } = useQuery({
    queryKey: ['following', artistId],
    queryFn: () => checkFollowingArtist(artistId),
    enabled: isAuthenticated,
  });

  const isFollowing = followStatus?.following || false;

  // Follow mutation
  const followMutation = useMutation({
    mutationFn: () => followArtist(artistId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['following', artistId] });
      queryClient.invalidateQueries({ queryKey: ['followerCount', artistId] });
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
      toast.error('Please sign in to follow artists');
      return;
    }

    followMutation.mutate();
  };

  if (!isAuthenticated) return null;

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
