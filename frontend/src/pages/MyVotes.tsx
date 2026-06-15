import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { getUserMonthlyVotes, getUserVotes } from '@/lib/api-client';

interface PollVoteView {
  id: number;
  poll_id: number;
  poll_title: string;
  poll_category: 'ARTIST' | 'ALBUM' | 'SONG';
  poll_status: 'ACTIVE' | 'CLOSED';
  selected_nominee: string;
  voted_at: string;
}

interface MonthlyVoteView {
  id: number;
  item_type: 'ARTIST' | 'ALBUM' | 'SONG';
  item_id: number;
  period: string;
  voted_at: string;
}

export default function MyVotes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pollVotes, setPollVotes] = useState<PollVoteView[]>([]);
  const [monthlyVotes, setMonthlyVotes] = useState<MonthlyVoteView[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVotes();
  }, []);

  const loadVotes = async () => {
    try {
      setLoading(true);
      const [pollVotesResponse, monthlyVotesResponse] = await Promise.all([
        getUserVotes(),
        getUserMonthlyVotes(),
      ]);

      setPollVotes(
        pollVotesResponse.votes.map((vote) => ({
          id: vote.id,
          poll_id: vote.poll?.id ?? vote.poll_id,
          poll_title: vote.poll?.title ?? `Poll #${vote.poll_id}`,
          poll_category: vote.poll?.category ?? 'ARTIST',
          poll_status: vote.poll?.status ?? 'CLOSED',
          selected_nominee: vote.nominee?.item_name ?? `Nominee #${vote.nominee_id}`,
          voted_at: vote.created_at,
        })),
      );

      setMonthlyVotes(
        monthlyVotesResponse.votes.map((vote) => ({
          id: vote.id,
          item_type: vote.item_type,
          item_id: vote.item_id,
          period: vote.period,
          voted_at: vote.created_at,
        })),
      );
    } catch (error) {
      console.error('Error loading votes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your votes',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      ALBUM: 'bg-secondary',
      ARTIST: 'bg-primary',
      SONG: 'bg-green-500',
      default: 'bg-gray-500',
    };
    return colors[category] || colors.default;
  };

  const hasVotes = pollVotes.length > 0 || monthlyVotes.length > 0;

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate('/voting')}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Voting
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-primary">
              My Votes
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            View all your voting history
          </p>
        </motion.div>

        {/* Votes List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your votes...</p>
          </div>
        ) : !hasVotes ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <CheckCircle className="w-16 h-16 mx-auto mb-4 opacity-50 text-gray-400" />
            <p className="text-gray-400 text-lg mb-4">You haven't voted yet</p>
            <Button onClick={() => navigate('/voting')}>
              Go to Voting
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">POLL VOTES</h2>
              </div>

              {pollVotes.length === 0 ? (
                <Card className="p-6 text-muted-foreground">No poll votes yet.</Card>
              ) : (
                <div className="space-y-4">
                  {pollVotes.map((vote, index) => (
                    <motion.div
                      key={vote.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-6 hover:shadow-hard transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(vote.poll_category)}`}>
                                {vote.poll_category}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                {vote.poll_status}
                              </span>
                            </div>

                            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                              {vote.poll_title}
                            </h3>

                            <div className="flex items-center gap-2 mb-3">
                              <CheckCircle className="w-5 h-5 text-green-600" />
                              <span className="text-gray-900 dark:text-white font-medium">
                                Your vote: <span className="text-primary">{vote.selected_nominee}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                              <Calendar className="w-4 h-4" />
                              <span>Voted: {formatDate(vote.voted_at)}</span>
                            </div>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/voting?poll=${vote.poll_id}`)}
                          >
                            View Poll
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-primary" />
                <h2 className="text-2xl font-bold">MONTHLY VOTES</h2>
              </div>

              {monthlyVotes.length === 0 ? (
                <Card className="p-6 text-muted-foreground">No monthly votes yet.</Card>
              ) : (
                <div className="space-y-4">
                  {monthlyVotes.map((vote, index) => (
                    <motion.div
                      key={vote.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="p-6 hover:shadow-hard transition-shadow">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(vote.item_type)}`}>
                                {vote.item_type}
                              </span>
                              <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                {vote.period}
                              </span>
                            </div>

                            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                              Item #{vote.item_id}
                            </h3>

                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                              <span>Type: {vote.item_type}</span>
                              <span>ID: {vote.item_id}</span>
                              <span>Period: {vote.period}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(vote.voted_at)}</span>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
