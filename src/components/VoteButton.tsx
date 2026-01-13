import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { voteForItem, getUserItemVotes, getItemVoteCount } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface VoteButtonProps {
  type: 'song' | 'album' | 'artist';
  itemId: number;
  variant?: 'default' | 'icon' | 'inline';
  showCount?: boolean;
  className?: string;
}

export function VoteButton({ type, itemId, variant = 'default', showCount = true, className }: VoteButtonProps) {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const queryClient = useQueryClient();

  const isAuthenticated = authStatus === 'authenticated' && !!user;

  // Get user's current votes (only if logged in)
  const { data: userVotesData } = useQuery({
    queryKey: ['userItemVotes'],
    queryFn: getUserItemVotes,
    enabled: isAuthenticated,
    retry: false,
    staleTime: 30000, // Cache for 30 seconds
  });

  // Get vote count for this item
  const { data: voteCountData } = useQuery({
    queryKey: ['itemVoteCount', type, itemId],
    queryFn: () => getItemVoteCount(type, itemId),
    retry: 1,
    staleTime: 10000, // Cache for 10 seconds
  });

  const voteMutation = useMutation({
    mutationFn: () => voteForItem(type, itemId),
    onSuccess: (data) => {
      if (data.success) {
        const actionText = data.action === 'removed' ? 'Vote removed' : 'Vote added!';
        toast.success(actionText);
        queryClient.invalidateQueries({ queryKey: ['userItemVotes'] });
        queryClient.invalidateQueries({ queryKey: ['itemVoteCount', type, itemId] });
      } else if (data.max_votes_reached) {
        toast.error(data.error || 'Maximum votes reached');
      } else {
        toast.error(data.error || 'Failed to vote');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to vote');
    },
  });

  const handleVote = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to vote');
      return;
    }
    voteMutation.mutate();
  };

  // Check if user has voted for this item (votes is now an array)
  const isVoted = userVotesData?.votes[type]?.includes(itemId) || false;
  const voteCount = voteCountData?.vote_count || 0;
  
  // Calculate how many votes user has used for this category
  const userVotesCount = userVotesData?.votes[type]?.length || 0;
  const maxVotes = 2;
  
  const getTitle = () => {
    if (!isAuthenticated) return 'Sign in to vote';
    if (isVoted) return 'Remove vote';
    if (userVotesCount >= maxVotes) return `Maximum ${maxVotes} votes reached. Remove one to vote for another.`;
    return `Vote for this (${userVotesCount}/${maxVotes} used)`;
  };

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleVote}
        disabled={voteMutation.isPending || !isAuthenticated}
        className={cn(
          'relative',
          isVoted && 'text-red-500 hover:text-red-600',
          !isAuthenticated && 'opacity-50 cursor-not-allowed',
          className
        )}
        title={getTitle()}
      >
        <Heart className={cn('w-5 h-5', isVoted && 'fill-current')} />
        {showCount && voteCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {voteCount > 99 ? '99+' : voteCount}
          </span>
        )}
      </Button>
    );
  }

  if (variant === 'inline') {
    return (
      <button
        onClick={handleVote}
        disabled={voteMutation.isPending || !isAuthenticated}
        className={cn(
          'inline-flex items-center gap-1 text-sm transition-colors',
          isVoted ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-foreground',
          !isAuthenticated && 'opacity-50 cursor-not-allowed',
          className
        )}
        title={getTitle()}
      >
        <Heart className={cn('w-4 h-4', isVoted && 'fill-current')} />
        {showCount && <span>{voteCount}</span>}
      </button>
    );
  }

  return (
    <Button
      variant={isVoted ? 'default' : 'outline'}
      onClick={handleVote}
      disabled={voteMutation.isPending || !isAuthenticated}
      className={cn('gap-2', !isAuthenticated && 'opacity-50', className)}
      title={getTitle()}
    >
      <Heart className={cn('w-4 h-4', isVoted && 'fill-current')} />
      {isVoted ? 'Voted' : 'Vote'}
      {showCount && voteCount > 0 && (
        <span className="ml-1 opacity-70">({voteCount})</span>
      )}
    </Button>
  );
}
