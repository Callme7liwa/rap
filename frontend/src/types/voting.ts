// Voting system types

export type VotingPeriod = 'month' | 'year' | 'alltime';
export type VotingCategory = 'rapper' | 'song' | 'album';

export interface Poll {
  id: string;
  title: string;
  description: string;
  category: VotingCategory;
  period: VotingPeriod;
  startDate: string;
  endDate: string;
  isActive: boolean;
  nominees: Nominee[];
  totalVotes: number;
  createdAt: string;
}

export interface Nominee {
  id: string;
  itemId: number; // artist_id, song_id, or album_id
  name: string;
  imageUrl: string;
  votes: number;
  percentage: number;
}

export interface Vote {
  id: string;
  pollId: string;
  nomineeId: string;
  userId: string;
  votedAt: string;
}

export interface VotingStats {
  totalPolls: number;
  activePolls: number;
  totalVotes: number;
  userVotes: number;
}
