import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { voteForItem, getUserItemVotes, getItemVoteCount } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/auth.store';

interface VoteButtonProps {
  type: 'song' | 'album' | 'artist';
  itemId: number;
  variant?: 'default' | 'icon' | 'inline';
  showCount?: boolean;
  className?: string;
}

export function VoteButton({ type, itemId, variant = 'default', showCount = true, className }: VoteButtonProps) {
  const { isAuthenticated, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Get user's current votes (only if logged in)
  const { data: userVotesData } = useQuery({
    queryKey: ['userItemVotes'],
    queryFn: getUserItemVotes,
    enabled: isAuthenticated && !isAdmin,
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
        toast.success('Vote added!');
        queryClient.invalidateQueries({ queryKey: ['userItemVotes'] });
        queryClient.invalidateQueries({ queryKey: ['itemVoteCount', type, itemId] });
      } else if (data.already_voted) {
        toast.error('Already voted this month');
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

  const isVoted = userVotesData?.votes[type]?.includes(itemId) || false;
  const voteCount = voteCountData?.vote_count || 0;
  
  const getTitle = () => {
    if (!isAuthenticated) return 'Sign in to vote';
    if (isVoted) return 'Voted ✓';
    return 'Vote for this';
  };

  if (isAdmin) {
    return null;
  }

  if (variant === 'icon') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleVote}
        disabled={voteMutation.isPending || !isAuthenticated || isVoted}
        className={cn(
          'relative',
          isVoted && 'text-primary bg-primary/10 cursor-not-allowed',
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
        disabled={voteMutation.isPending || !isAuthenticated || isVoted}
        className={cn(
          'inline-flex items-center gap-1 text-sm transition-colors',
          isVoted ? 'text-primary cursor-not-allowed' : 'text-muted-foreground hover:text-foreground',
          !isAuthenticated && 'opacity-50 cursor-not-allowed',
          className
        )}
        title={getTitle()}
      >
        <Heart className={cn('w-4 h-4', isVoted && 'fill-current')} />
        {isVoted ? <span>Voted ✓</span> : showCount && <span>{voteCount}</span>}
      </button>
    );
  }

  return (
    <Button
      variant={isVoted ? 'default' : 'outline'}
      onClick={handleVote}
      disabled={voteMutation.isPending || !isAuthenticated || isVoted}
      className={cn(
        'gap-2',
        isVoted && 'bg-primary text-primary-foreground hover:bg-primary cursor-not-allowed',
        !isAuthenticated && 'opacity-50',
        className,
      )}
      title={getTitle()}
    >
      <Heart className={cn('w-4 h-4', isVoted && 'fill-current')} />
      {isVoted ? 'VOTED' : 'Vote'}
      {showCount && voteCount > 0 && (
        <span className="ml-1 opacity-70">({voteCount})</span>
      )}
    </Button>
  );
}
