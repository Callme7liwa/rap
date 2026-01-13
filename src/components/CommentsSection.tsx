import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { fetchAuthSession } from 'aws-amplify/auth';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userImage: string;
  content: string;
  createdAt: number;
  likes: number;
}

interface CommentsSectionProps {
  contentType: 'song' | 'album';
  contentId: string;
  comments: Comment[];
  onCommentsUpdate: () => void;
  isLoading?: boolean;
}

export function CommentsSection({
  contentType,
  contentId,
  comments,
  onCommentsUpdate,
  isLoading = false
}: CommentsSectionProps) {
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);

  // Check authentication
  const checkAuth = async () => {
    try {
      const session = await fetchAuthSession();
      const isAuth = !!session.tokens?.accessToken;
      setIsAuthenticated(isAuth);
      
      if (isAuth && session.tokens?.idToken) {
        const userId = (session.tokens.idToken.payload.sub as string) || null;
        setCurrentUserId(userId);
      }
    } catch {
      setIsAuthenticated(false);
      setCurrentUserId(null);
    }
  };

  // Check auth on mount
  useState(() => {
    checkAuth();
  });

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to comment');
      return;
    }

    setSubmitting(true);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      if (!token) {
        toast.error('Please sign in to comment');
        return;
      }

      const endpoint = contentType === 'song' 
        ? `${import.meta.env.VITE_API_ENDPOINT}/songs/${contentId}/comment`
        : `${import.meta.env.VITE_API_ENDPOINT}/albums/${contentId}/comment`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: commentText }),
      });

      if (!response.ok) {
        throw new Error('Failed to add comment');
      }

      setCommentText('');
      toast.success('Comment added successfully!');
      onCommentsUpdate();
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setDeletingCommentId(commentId);
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      if (!token) {
        toast.error('Please sign in');
        return;
      }

      const endpoint = contentType === 'song'
        ? `${import.meta.env.VITE_API_ENDPOINT}/songs/${contentId}/comment/${commentId}`
        : `${import.meta.env.VITE_API_ENDPOINT}/albums/${contentId}/comment/${commentId}`;

      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete comment');
      }

      toast.success('Comment deleted successfully!');
      onCommentsUpdate();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="border-t pt-8 mt-8"
    >
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6" />
        Comments ({comments.length})
      </h2>

      {/* Comment Form */}
      <div className="mb-8 bg-muted/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Leave a Comment</h3>
        {isAuthenticated ? (
          <div className="space-y-4">
            <Textarea
              placeholder="Share your thoughts..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button
                onClick={handleSubmitComment}
                disabled={submitting || !commentText.trim()}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                {submitting ? 'Posting...' : 'Post Comment'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <p>Please sign in to leave a comment</p>
          </div>
        )}
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-6">
          {comments.map((comment) => (
            <motion.div
              key={comment.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4 p-4 rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors"
            >
              <Avatar className="w-10 h-10">
                <AvatarImage src={comment.userImage} />
                <AvatarFallback>
                  {comment.userName.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{comment.userName}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  {currentUserId === comment.userId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteComment(comment.id)}
                      disabled={deletingCommentId === comment.id}
                      className="gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      {deletingCommentId === comment.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      )}
    </motion.div>
  );
}
