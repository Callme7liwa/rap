import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { Heart } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { likeContent, checkLikedContent, getContentLikeCount } from '@/lib/api';

interface LikeButtonProps {
  contentType: 'song' | 'album';
  contentId: number;
  onLikeChange?: (liked: boolean, count: number) => void;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showCount?: boolean;
  className?: string;
}

export function LikeButton({
  contentType,
  contentId,
  onLikeChange,
  variant = 'ghost',
  size = 'default',
  showCount = true,
  className,
}: LikeButtonProps) {
  const { user } = useAuthenticator((context) => [context.user]);
  const queryClient = useQueryClient();
  const isAuthenticated = !!user;

  // Check if user has liked this content
  const { data: likedStatus } = useQuery({
    queryKey: ['liked', contentType, contentId],
    queryFn: () => checkLikedContent(contentType, contentId),
    enabled: isAuthenticated,
  });

  // Get like count
  const { data: likeCountData } = useQuery({
    queryKey: ['likeCount', contentType, contentId],
    queryFn: () => getContentLikeCount(contentType, contentId),
  });

  const liked = likedStatus?.liked || false;
  const likeCount = likeCountData?.count || 0;

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: () => likeContent(contentType, contentId),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['liked', contentType, contentId] });
      await queryClient.cancelQueries({ queryKey: ['likeCount', contentType, contentId] });

      // Snapshot previous values
      const previousLiked = queryClient.getQueryData(['liked', contentType, contentId]);
      const previousCount = queryClient.getQueryData(['likeCount', contentType, contentId]);

      // Optimistically update
      const newLiked = !liked;
      const newCount = newLiked ? likeCount + 1 : likeCount - 1;
      
      queryClient.setQueryData(['liked', contentType, contentId], { liked: newLiked });
      queryClient.setQueryData(['likeCount', contentType, contentId], { count: newCount });
      
      onLikeChange?.(newLiked, newCount);

      return { previousLiked, previousCount };
    },
    onSuccess: (data) => {
      // Update liked status with server value
      queryClient.setQueryData(['liked', contentType, contentId], { liked: data.liked });
      
      // Refetch the count
      queryClient.invalidateQueries({ queryKey: ['likeCount', contentType, contentId] });
      
      toast.success(data.liked ? 'Added to favorites' : 'Removed from favorites');
    },
    onError: (error: Error, _variables, context) => {
      // Revert optimistic update
      if (context?.previousLiked) {
        queryClient.setQueryData(['liked', contentType, contentId], context.previousLiked);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(['likeCount', contentType, contentId], context.previousCount);
      }
      
      toast.error(error.message || 'Failed to update like');
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.error('Please sign in to like content');
      return;
    }

    likeMutation.mutate();
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLike}
      disabled={likeMutation.isPending}
      className={className}
    >
      <Heart
        className={`w-4 h-4 transition-colors ${
          liked ? 'fill-red-500 text-red-500' : ''
        }`}
      />
      {showCount && <span className="ml-2 text-sm">{likeCount}</span>}
    </Button>
  );
}
