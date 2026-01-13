import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, Send, Trash2, Loader2 } from 'lucide-react';
import { addComment, getComments, deleteComment } from '@/lib/api';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface CommentSectionProps {
  type: 'song' | 'album';
  itemId: number;
  itemName?: string;
}

export function CommentSection({ type, itemId, itemName }: CommentSectionProps) {
  const { user } = useAuthenticator((context) => [context.user]);
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const isAuthenticated = !!user;

  // Get current user's Cognito ID
  useState(() => {
    if (isAuthenticated) {
      fetchAuthSession().then(session => {
        const userId = session.tokens?.idToken?.payload.sub as string;
        if (userId) setCurrentUserId(userId);
      });
    }
  });

  // Get comments
  const { data: commentsData, isLoading } = useQuery({
    queryKey: ['comments', type, itemId],
    queryFn: () => getComments(type, itemId, 50),
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (text: string) => addComment(type, itemId, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', type, itemId] });
      setCommentText('');
      toast.success('Comment added!');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => deleteComment(type, itemId, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', type, itemId] });
      toast.success('Comment deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete comment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated) {
      toast.error('Please sign in to comment');
      return;
    }

    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (commentText.length > 500) {
      toast.error('Comment is too long (max 500 characters)');
      return;
    }

    addCommentMutation.mutate(commentText);
  };

  const comments = commentsData?.comments || [];
  const commentCount = comments.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <CardTitle>Comments ({commentCount})</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment Form */}
        {isAuthenticated && (
          <form onSubmit={handleSubmit} className="space-y-2">
            <Textarea
              placeholder={`Share your thoughts about ${itemName || `this ${type}`}...`}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={3}
              maxLength={500}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {commentText.length}/500 characters
              </span>
              <Button
                type="submit"
                size="sm"
                disabled={addCommentMutation.isPending || !commentText.trim()}
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Post Comment
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        {!isAuthenticated && (
          <div className="text-center py-4 text-muted-foreground">
            <p>Sign in to leave a comment</p>
          </div>
        )}

        {/* Comments List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : commentCount === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-4">
              {comments.map((comment) => (
                <div
                  key={comment.comment_id}
                  className="border rounded-lg p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{comment.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    {currentUserId === comment.user_id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCommentMutation.mutate(comment.comment_id)}
                        disabled={deleteCommentMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
