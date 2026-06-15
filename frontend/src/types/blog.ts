// Blog system types

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

export interface BlogDraft {
  id: string;
  title: string;
  content: string;
  authorId: number;
  lastSaved: string;
}

export interface BlogStats {
  totalPosts: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}
