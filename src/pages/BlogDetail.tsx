import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LikeButton } from '@/components/LikeButton';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Heart, MessageSquare, Calendar, Share2, Bookmark, Send, Edit } from 'lucide-react';
import { BlogPost, BlogComment } from '@/types/blog';
import { getBlogPostBySlug, getBlogComments, addBlogComment } from '@/lib/blog-api';
import { fetchAuthSession } from 'aws-amplify/auth';

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      loadPost(slug);
      loadComments(slug);
      checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const checkAuth = async () => {
    try {
      const session = await fetchAuthSession();
      const isAuth = !!session.tokens?.accessToken;
      setIsAuthenticated(isAuth);
      
      if (isAuth && session.tokens?.idToken) {
        // Get user ID from token
        const userId = (session.tokens.idToken.payload.sub as string) || null;
        setCurrentUserId(userId);
        console.log('🔐 Current user ID:', userId);
      }
    } catch {
      setIsAuthenticated(false);
      setCurrentUserId(null);
    }
  };

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

  const loadComments = async (slug: string) => {
    setCommentsLoading(true);
    try {
      const commentsData = await getBlogComments(slug);
      setComments(commentsData);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim()) {
      toast.error('Please enter a comment');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please sign in to comment');
      return;
    }

    setSubmittingComment(true);
    try {
      const newComment = await addBlogComment(slug!, commentText);
      if (newComment) {
        setComments([newComment, ...comments]);
        setCommentText('');
        toast.success('Comment added successfully!');
        
        // Update comment count
        if (post) {
          setPost({ ...post, commentCount: post.commentCount + 1 });
        }
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleLike = () => {
    // This is now handled by the LikeButton component
    toast.success('Like updated');
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    toast.success(bookmarked ? 'Removed from bookmarks' : 'Added to bookmarks');
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
          className="aspect-video rounded-2xl overflow-hidden mb-8 shadow-elevated"
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
            
            <LikeButton
              contentType="blog"
              contentId={post.id}
              contentSlug={post.slug}
              size="default"
              variant="outline"
            />
            <Button
              variant={bookmarked ? 'default' : 'outline'}
              onClick={handleBookmark}
              className="gap-2"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-current' : ''}`} />
              {bookmarked ? 'Saved' : 'Save'}
            </Button>
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
                    disabled={submittingComment || !commentText.trim()}
                    className="gap-2"
                  >
                    <Send className="w-4 h-4" />
                    {submittingComment ? 'Posting...' : 'Post Comment'}
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
                    <div className="flex items-center gap-2 mb-2">
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
