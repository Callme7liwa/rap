export const QUERY_KEYS = {
  adminUsers: (page: number, role: string, q: string) =>
    ['adminUsers', page, role, q] as const,
  followerCount: (artistId: number) => ['followerCount', artistId] as const,
  followStatus: (artistId: number) => ['followStatus', artistId] as const,
  likeStatus: (type: string, id: number) => ['likeStatus', type, id] as const,
  likeCount: (type: string, id: number) => ['likeCount', type, id] as const,
  comments: (type: string, id: number) => ['comments', type, id] as const,
  blogStatus: (slug: string) => ['blogStatus', slug] as const,
  blogComments: (slug: string) => ['blogComments', slug] as const,
} as const;
