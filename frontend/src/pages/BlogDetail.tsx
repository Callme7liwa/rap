import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Heart, MessageSquare, Calendar, Share2, Bookmark, Send, Edit, Trash2 } from 'lucide-react';
import { BlogPost } from '@/types/blog';
import {
  createBlogComment,
  deleteBlogComment,
  getBlogComments,
  getBlogPostBySlug,
  getBlogPostStatus,
  likeBlogPost,
  saveBlogPost,
} from '@/lib/blog-api';
import { QUERY_KEYS } from '@/lib/query-keys';
import { useAuth } from '@/store/auth.store';

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { user, isAuthenticated, isAdmin } = useAuth();

  const { data: status } = useQuery({
    queryKey: QUERY_KEYS.blogStatus(slug ?? ''),
    queryFn: () => getBlogPostStatus(slug!),
    enabled: Boolean(slug && isAuthenticated),
  });

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: QUERY_KEYS.blogComments(slug ?? ''),
    queryFn: () => getBlogComments(slug!),
    enabled: Boolean(slug),
  });

  useEffect(() => {
    if (slug) {
      loadPost(slug);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  useEffect(() => {
    setCurrentUserId(user ? String(user.id) : null);
  }, [user]);

  const loadPost = async (slug: string) => {
    setLoading(true);
    try {
      const postData = await getBlogPostBySlug(slug);
      if (!postData) {
        navigate('/blog');
        toast.error('Post not found');
        return;
      }
      setPost(postData);
      console.log('📝 Post author ID:', postData.authorId);
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const createCommentMutation = useMutation({
    mutationFn: (content: string) => createBlogComment(slug!, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blogComments(slug!) });
      setCommentText('');
      toast.success('Comment added successfully!');

      if (post) {
        setPost({ ...post, commentCount: post.commentCount + 1 });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: number) => deleteBlogComment(slug!, commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.blogComments(slug!) });
      toast.success('Comment deleted');

      if (post) {
        setPost({ ...post, commentCount: Math.max(0, post.commentCount - 1) });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete comment');
    },
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

    createCommentMutation.mutate(commentText);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: post?.title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-8 w-24 mb-6" />
          <Skeleton className="h-96 w-full mb-6" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/blog')}
          className="mb-6 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Blog
        </Button>

        {/* Cover Image */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="aspect-video rounded-none overflow-hidden mb-8 shadow-elevated"
        >
          <img
            src={post.coverImage}
            alt={post.title}
            className="w-full h-full object-cover"
          />
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Title */}
          <h1 className="mb-4">{post.title}</h1>

          {/* Meta */}
          <div className="flex items-center gap-6 mb-6">
            <div className="flex items-center gap-3">
              <img
                src={post.authorImage}
                alt={post.authorName}
                className="w-12 h-12 rounded-full"
              />
              <div>
                <Link
                  to={`/artists/${post.authorId}`}
                  className="font-semibold hover:text-primary transition-colors"
                >
                  {post.authorName}
                </Link>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(post.publishedAt)}
                </p>
              </div>
            </div>

            <Separator orientation="vertical" className="h-10" />

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="w-4 h-4" />
                {post.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                {post.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4" />
                {post.commentCount}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 mb-8">
            {/* Edit button - only show to post author */}
            {(() => {
              const isOwner = isAuthenticated && currentUserId && String(post.authorId) === String(currentUserId);
              console.log('🔍 Edit button visibility check:', {
                isAuthenticated,
                currentUserId,
                authorId: post.authorId,
                isOwner
              });
              return isOwner && (
                <Button
                  variant="default"
                  onClick={() => navigate(`/blog/${post.slug}/edit`)}
                  className="gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Post
                </Button>
              );
            })()}
            
            {!isAdmin && (
              <>
                <BlogLikeButton
                  slug={post.slug}
                  liked={status?.liked ?? false}
                  count={post.likeCount}
                  isAuthenticated={isAuthenticated}
                  onCountChange={(count) => setPost({ ...post, likeCount: count })}
                />
                <BlogSaveButton
                  slug={post.slug}
                  saved={status?.saved ?? false}
                  isAuthenticated={isAuthenticated}
                />
              </>
            )}
            <Button variant="outline" onClick={handleShare} className="gap-2">
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>

          <Separator className="mb-8" />
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="prose prose-invert max-w-none mb-12"
        >
          {/* Simple markdown rendering - split by lines and render */}
          {post.content.split('\n').map((line, i) => {
            // Headers
            if (line.startsWith('## ')) {
              return <h2 key={i} className="text-3xl font-bold mt-8 mb-4">{line.slice(3)}</h2>;
            }
            if (line.startsWith('### ')) {
              return <h3 key={i} className="text-2xl font-bold mt-6 mb-3">{line.slice(4)}</h3>;
            }
            // Horizontal rule
            if (line === '---') {
              return <hr key={i} className="my-8" />;
            }
            // List items
            if (line.match(/^\d+\. /)) {
              return <li key={i} className="ml-6">{line.replace(/^\d+\. /, '')}</li>;
            }
            if (line.startsWith('- ')) {
              return <li key={i} className="ml-6">{line.slice(2)}</li>;
            }
            // Empty line
            if (line.trim() === '') {
              return <br key={i} />;
            }
            // Regular paragraph
            return <p key={i} className="mb-4 leading-relaxed">{line}</p>;
          })}
        </motion.div>

        {/* Comments Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="border-t pt-8"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Comments ({post.commentCount})
          </h2>

          {/* Comment Form */}
          <div className="mb-8 bg-muted/30 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Leave a Comment</h3>
            {isAuthenticated && !isAdmin ? (
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
                    disabled={createCommentMutation.isPending || !commentText.trim()}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                  </Button>
                </div>
              </div>
            ) : !isAuthenticated ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>Please sign in to leave a comment</p>
              </div>
            ) : null}
          </div>

          {/* Comments List */}
          {commentsLoading ? (
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
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{comment.userName}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {(comment.userId === currentUserId || isAdmin) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCommentMutation.mutate(Number(comment.id))}
                          disabled={deleteCommentMutation.isPending}
                          className="gap-2 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
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
      </div>
    </div>
  );
}

function BlogLikeButton({
  slug,
  liked,
  count,
  isAuthenticated,
  onCountChange,
}: {
  slug: string;
  liked: boolean;
  count: number;
  isAuthenticated: boolean;
  onCountChange: (count: number) => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => likeBlogPost(slug),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.blogStatus(slug), {
        liked: data.liked,
        saved: queryClient.getQueryData<{ liked: boolean; saved: boolean }>(
          QUERY_KEYS.blogStatus(slug),
        )?.saved ?? false,
      });
      onCountChange(data.count);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update like');
    },
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    mutation.mutate();
  };

  return (
    <Button
      variant={liked ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={mutation.isPending}
      className={`gap-2 ${liked ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}`}
    >
      <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
      {liked ? 'Liked' : 'Like'}
      <span className="text-sm opacity-80">({count})</span>
    </Button>
  );
}

function BlogSaveButton({
  slug,
  saved,
  isAuthenticated,
}: {
  slug: string;
  saved: boolean;
  isAuthenticated: boolean;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () => saveBlogPost(slug),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.blogStatus(slug), {
        liked: queryClient.getQueryData<{ liked: boolean; saved: boolean }>(
          QUERY_KEYS.blogStatus(slug),
        )?.liked ?? false,
        saved: data.saved,
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update save');
    },
  });

  const handleClick = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    mutation.mutate();
  };

  return (
    <Button
      variant={saved ? 'default' : 'outline'}
      onClick={handleClick}
      disabled={mutation.isPending}
      className={`gap-2 ${saved ? 'bg-primary text-primary-foreground hover:bg-primary' : ''}`}
    >
      <Bookmark className={`w-4 h-4 ${saved ? 'fill-current' : ''}`} />
      {saved ? 'Saved' : 'Save'}
    </Button>
  );
}
