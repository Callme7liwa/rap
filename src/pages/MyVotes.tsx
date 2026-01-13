import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Calendar, Users, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';

interface UserVote {
  vote_id: string;
  event_id: string;
  event_title: string;
  event_category: string;
  selected_option: string;
  voted_at: number;
  event_end_date: string;
}

export default function MyVotes() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [votes, setVotes] = useState<UserVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVotes();
  }, []);

  const loadVotes = async () => {
    try {
      setLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/user/votes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load votes');
      }

      const data = await response.json();
      setVotes(data.votes || []);
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

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isEventActive = (endDate: string) => {
    return new Date(endDate) > new Date();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      album: 'bg-purple-500',
      artist: 'bg-blue-500',
      song: 'bg-green-500',
      lyrics: 'bg-yellow-500',
      collaboration: 'bg-pink-500',
      general: 'bg-gray-500',
    };
    return colors[category] || colors.general;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
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
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your votes...</p>
          </div>
        ) : votes.length === 0 ? (
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
          <div className="space-y-4">
            {votes.map((vote, index) => (
              <motion.div
                key={vote.vote_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium text-white ${getCategoryColor(vote.event_category)}`}>
                          {vote.event_category}
                        </span>
                        {isEventActive(vote.event_end_date) && (
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            Active
                          </span>
                        )}
                      </div>

                      <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
                        {vote.event_title}
                      </h3>

                      <div className="flex items-center gap-2 mb-3">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <span className="text-gray-900 dark:text-white font-medium">
                          Your vote: <span className="text-primary">{vote.selected_option}</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Voted: {formatDate(vote.voted_at)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>Ends: {new Date(vote.event_end_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/voting?event=${vote.event_id}`)}
                    >
                      View Event
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
