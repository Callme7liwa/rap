import { fetchAuthSession } from 'aws-amplify/auth';


const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  authorId: string | number;
  authorName: string;
  authorImage: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  isPublished: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface BlogComment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userImage: string;
  content: string;
  createdAt: string;
  likes: number;
}

export interface BlogStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

export async function getBlogPosts(limit?: number): Promise<BlogPost[]> {
  try {
    const url = `${API_ENDPOINT}/blog-posts${limit ? `?limit=${limit}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error('Failed to fetch blog posts');
    }
    
    const data = await response.json();

    data.posts.forEach(element => {
      console.log("Blog Post:", element);
    });
  
    
    return (data.posts || []).map((post: any) => ({
      id: post.post_id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.cover_image,
      authorId: post.author_id,
      authorName: post.author_email || post.author_id,
      authorImage: '/placeholder.svg',
      tags: post.tags || [],
      publishedAt: new Date(post.published_at || post.created_at).toISOString(),
      updatedAt: new Date(post.updated_at).toISOString(),
      isPublished: post.status === 'published',
      viewCount: post.views || 0,
      likeCount: post.likes || 0,
      commentCount: post.comments || 0,
    }));
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return [];
  }
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const response = await fetch(`${API_ENDPOINT}/blog-posts/${slug}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error('Failed to fetch blog post');
    }
    
    const data = await response.json();
    const post = data.post;
    
    if (!post) {
      return null;
    }
    
    return {
      id: post.post_id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      coverImage: post.cover_image,
      authorId: post.author_id,
      authorName: post.author_email || post.author_id,
      authorImage: '/placeholder.svg',
      tags: post.tags || [],
      publishedAt: new Date(post.published_at || post.created_at).toISOString(),
      updatedAt: new Date(post.updated_at).toISOString(),
      isPublished: post.status === 'published',
      viewCount: post.views || 0,
      likeCount: post.likes || 0,
      commentCount: post.comments || 0,
    };
  } catch (error) {
    console.error('Error fetching blog post:', error);
    return null;
  }
}

export async function getBlogPostsByAuthor(authorId: number): Promise<BlogPost[]> {
  const allPosts = await getBlogPosts();
  return allPosts.filter(p => p.authorId === authorId || p.authorId === String(authorId));
}

export async function createBlogPost(post: Partial<BlogPost>, tokenn: string): Promise<BlogPost> {
  try {


    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (!token) {
      alert("Please sign in to create a blog post");
      return;
    }

    const response = await fetch(`${API_ENDPOINT}/blog-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        tags: post.tags,
        status: post.isPublished ? 'published' : 'draft',
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create blog post');
    }
    
    const data = await response.json();
    const newPost = data.post;
    
    return {
      id: newPost.post_id,
      title: newPost.title,
      slug: newPost.slug,
      excerpt: newPost.excerpt,
      content: newPost.content,
      coverImage: newPost.cover_image,
      authorId: newPost.author_id,
      authorName: newPost.author_email || newPost.author_id,
      authorImage: '/placeholder.svg',
      tags: newPost.tags || [],
      publishedAt: new Date(newPost.published_at || newPost.created_at).toISOString(),
      updatedAt: new Date(newPost.updated_at).toISOString(),
      isPublished: newPost.status === 'published',
      viewCount: newPost.views || 0,
      likeCount: newPost.likes || 0,
      commentCount: newPost.comments || 0,
    };
  } catch (error) {
    console.error('Error creating blog post:', error);
    throw error;
  }
}

export async function updateBlogPost(slug: string, post: Partial<BlogPost> & { status?: 'draft' | 'published' }): Promise<void> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    if (!token) {
      throw new Error('Please sign in to update a blog post');
    }

    const response = await fetch(`${API_ENDPOINT}/blog-posts/${slug}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: post.title,
        excerpt: post.excerpt,
        content: post.content,
        coverImage: post.coverImage,
        tags: post.tags,
        status: post.status,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update blog post');
    }
  } catch (error) {
    console.error('Error updating blog post:', error);
    throw error;
  }
}

export async function getBlogStats(): Promise<BlogStats> {
  const posts = await getBlogPosts();
  
  return {
    totalPosts: posts.length,
    totalViews: posts.reduce((sum, post) => sum + post.viewCount, 0),
    totalLikes: posts.reduce((sum, post) => sum + post.likeCount, 0),
    totalComments: posts.reduce((sum, post) => sum + post.commentCount, 0),
  };
}

// ============================================
// Comment Functions
// ============================================

export async function getBlogComments(slug: string): Promise<BlogComment[]> {
  try {
    const response = await fetch(`${API_ENDPOINT}/blog/${slug}/comments`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch comments');
    }
    
    const data = await response.json();
    
    // Backend now provides user_name and user_picture
    const comments = (data.comments || []).map((comment: any) => {
      return {
        id: comment.comment_id,
        postId: comment.post_id,
        userId: comment.user_id,
        userName: comment.user_name || comment.user_email?.split('@')[0] || 'User',
        userImage: comment.user_picture || '/placeholder.svg',
        content: comment.content,
        createdAt: new Date(comment.created_at).toISOString(),
        likes: 0, // Can be extended later
      };
    });
    
    return comments;
  } catch (error) {
    console.error('Error fetching comments:', error);
    return [];
  }
}

export async function addBlogComment(slug: string, content: string): Promise<BlogComment | null> {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    
    if (!token) {
      throw new Error('Please sign in to comment');
    }

    const response = await fetch(`${API_ENDPOINT}/blog/${slug}/comment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ content }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to add comment');
    }
    
    const data = await response.json();
    const comment = data.comment;
    
    // Backend now returns user_name and user_picture
    return {
      id: comment.comment_id,
      postId: comment.post_id,
      userId: comment.user_id,
      userName: comment.user_name || comment.user_email?.split('@')[0] || 'User',
      userImage: comment.user_picture || '/placeholder.svg',
      content: comment.content,
      createdAt: new Date(comment.created_at).toISOString(),
      likes: 0,
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
}
