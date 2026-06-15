import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { likeContent, checkLikedContent, getContentLikeCount } from '@/lib/api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useAuth } from '@/store/auth.store';
import { useNavigate } from 'react-router-dom';

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
  const { isAuthenticated, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check if user has liked this content
  const { data: likedStatus } = useQuery({
    queryKey: QUERY_KEYS.likeStatus(contentType, contentId),
    queryFn: () => checkLikedContent(contentType, contentId),
    enabled: isAuthenticated && !isAdmin,
  });

  // Get like count
  const { data: likeCountData } = useQuery({
    queryKey: QUERY_KEYS.likeCount(contentType, contentId),
    queryFn: () => getContentLikeCount(contentType, contentId),
  });

  const liked = likedStatus?.liked || false;
  const likeCount = likeCountData?.count || 0;

  // Like/unlike mutation
  const likeMutation = useMutation({
    mutationFn: () => likeContent(contentType, contentId),
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likeStatus(contentType, contentId) });
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.likeCount(contentType, contentId) });

      // Snapshot previous values
      const previousLiked = queryClient.getQueryData(QUERY_KEYS.likeStatus(contentType, contentId));
      const previousCount = queryClient.getQueryData(QUERY_KEYS.likeCount(contentType, contentId));

      // Optimistically update
      const newLiked = !liked;
      const newCount = newLiked ? likeCount + 1 : likeCount - 1;
      
      queryClient.setQueryData(QUERY_KEYS.likeStatus(contentType, contentId), { liked: newLiked });
      queryClient.setQueryData(QUERY_KEYS.likeCount(contentType, contentId), { count: newCount });
      
      onLikeChange?.(newLiked, newCount);

      return { previousLiked, previousCount };
    },
    onSuccess: (data) => {
      // Update liked status with server value
      queryClient.setQueryData(QUERY_KEYS.likeStatus(contentType, contentId), { liked: data.liked });
      
      // Refetch the count
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.likeCount(contentType, contentId) });
      
      toast.success(data.liked ? 'Added to favorites' : 'Removed from favorites');
    },
    onError: (error: Error, _variables, context) => {
      // Revert optimistic update
      if (context?.previousLiked) {
        queryClient.setQueryData(QUERY_KEYS.likeStatus(contentType, contentId), context.previousLiked);
      }
      if (context?.previousCount) {
        queryClient.setQueryData(QUERY_KEYS.likeCount(contentType, contentId), context.previousCount);
      }
      
      toast.error(error.message || 'Failed to update like');
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    likeMutation.mutate();
  };

  if (isAdmin) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleLike}
      disabled={likeMutation.isPending}
      className={`${!isAuthenticated ? 'opacity-70' : ''} ${className ?? ''}`}
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
