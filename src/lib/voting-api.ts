// Mock data for voting system (replace with real API later)

import { Poll, VotingStats } from '@/types/voting';
import seedData from '@/data/seed.json';

// Helper to generate polls
const generateMockPolls = (): Poll[] => {
  const artists = (seedData as any[]).slice(0, 5);
  const songs = artists.flatMap(a => a.songs?.slice(0, 2) || []).slice(0, 5);
  
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return [
    {
      id: 'poll-rapper-month-2025-10',
      title: 'Rapper of the Month - October 2025',
      description: 'Vote for your favorite rapper this month!',
      category: 'rapper' as const,
      period: 'month' as const,
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      isActive: true,
      totalVotes: 1247,
      createdAt: monthStart.toISOString(),
      nominees: artists.map((artist, i) => ({
        id: `nominee-${artist.id}`,
        itemId: artist.id,
        name: artist.name,
        imageUrl: artist.image_url || '/placeholder.svg',
        votes: Math.floor(Math.random() * 300) + 50,
        percentage: 0,
      })),
    },
    {
      id: 'poll-song-month-2025-10',
      title: 'Song of the Month - October 2025',
      description: 'Which track has been on repeat this month?',
      category: 'song' as const,
      period: 'month' as const,
      startDate: monthStart.toISOString(),
      endDate: monthEnd.toISOString(),
      isActive: true,
      totalVotes: 892,
      createdAt: monthStart.toISOString(),
      nominees: songs.map((song, i) => ({
        id: `nominee-song-${song.id}`,
        itemId: song.id,
        name: song.title,
        imageUrl: song.song_art_image_url || '/placeholder.svg',
        votes: Math.floor(Math.random() * 200) + 30,
        percentage: 0,
      })),
    },
  ].map(poll => {
    // Calculate percentages
    poll.nominees.forEach(n => {
      n.percentage = poll.totalVotes > 0 ? (n.votes / poll.totalVotes) * 100 : 0;
    });
    // Sort by votes
    poll.nominees.sort((a, b) => b.votes - a.votes);
    return poll;
  });
};

export const mockPolls = generateMockPolls();

export const mockVotingStats: VotingStats = {
  totalPolls: 24,
  activePolls: 2,
  totalVotes: 15430,
  userVotes: 12,
};

// API functions (mock for now)
export async function getActivePolls(): Promise<Poll[]> {
  return Promise.resolve(mockPolls.filter(p => p.isActive));
}

export async function getPollById(id: string): Promise<Poll | null> {
  return Promise.resolve(mockPolls.find(p => p.id === id) || null);
}

export async function submitVote(pollId: string, nomineeId: string): Promise<boolean> {
  try {
    const { fetchAuthSession } = await import('aws-amplify/auth');
    const session = await fetchAuthSession();
    const token = session.tokens?.accessToken?.toString();
    
    if (!token) {
      throw new Error('Please sign in to vote');
    }

    const API_ENDPOINT = import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000/api';
    const response = await fetch(`${API_ENDPOINT}/voting/${pollId}/vote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nomineeId }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit vote');
    }

    return true;
  } catch (error) {
    console.error('Vote submission error:', error);
    throw error;
  }
}

export async function getVotingStats(): Promise<VotingStats> {
  return Promise.resolve(mockVotingStats);
}

export async function getUserVotes(userId: string): Promise<string[]> {
  // Returns poll IDs user has voted in
  return Promise.resolve(['poll-rapper-month-2025-10']);
}
