import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { getActivePolls, castVote, getUserVotes, getUserItemVotes, getSongById, getAlbumById, getArtistById, getTopVotedItems } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Vote, Trophy, Calendar, Users, CheckCircle2, Music, Disc, Mic2, Heart, X, TrendingUp, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { VoteButton } from '@/components/VoteButton';

export default function Voting() {
  const { user } = useAuthenticator((context) => [context.user]);
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = useState<'song' | 'album' | 'artist' | 'all'>('all');

  const { data: pollsData, isLoading } = useQuery({
    queryKey: ['polls', selectedCategory],
    queryFn: () => getActivePolls(selectedCategory === 'all' ? undefined : selectedCategory),
  });

  const { data: userVotesData } = useQuery({
    queryKey: ['userVotes'],
    queryFn: getUserVotes,
    enabled: !!user,
  });

  // Get user's direct item votes (for VoteButton system)
  const { data: userItemVotesData } = useQuery({
    queryKey: ['userItemVotes'],
    queryFn: getUserItemVotes,
    enabled: !!user,
  });

  // Get top voted items
  const { data: topVotedData, isLoading: topVotedLoading } = useQuery({
    queryKey: ['topVoted', selectedCategory],
    queryFn: () => getTopVotedItems(selectedCategory === 'all' ? undefined : selectedCategory, 5),
  });

  const voteMutation = useMutation({
    mutationFn: ({ pollId, nomineeId }: { pollId: string; nomineeId: number }) => 
      castVote(pollId, nomineeId),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Vote cast successfully! 🎉');
        queryClient.invalidateQueries({ queryKey: ['polls'] });
        queryClient.invalidateQueries({ queryKey: ['userVotes'] });
      } else {
        toast.error(data.error || 'Failed to cast vote');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cast vote');
    },
  });

  const handleVote = (pollId: string, nomineeId: number) => {
    if (!user) {
      toast.error('Please sign in to vote');
      return;
    }
    voteMutation.mutate({ pollId, nomineeId });
  };

  const hasUserVoted = (pollId: string) => {
    return userVotesData?.votes.some(v => v.poll_id === pollId) || false;
  };

  const getUserVoteForPoll = (pollId: string) => {
    return userVotesData?.votes.find(v => v.poll_id === pollId);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'song': return <Music className="w-5 h-5" />;
      case 'album': return <Disc className="w-5 h-5" />;
      case 'artist': return <Mic2 className="w-5 h-5" />;
      default: return <Vote className="w-5 h-5" />;
    }
  };

  const getCategoryLabel = (category: string, period: string) => {
    const isMonthly = period.includes('-');
    const typeLabel = category.charAt(0).toUpperCase() + category.slice(1);
    const timeLabel = isMonthly ? 'of the Month' : 'of the Year';
    return `${typeLabel} ${timeLabel}`;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500 hover:bg-yellow-600">🥇 1st</Badge>;
    if (index === 1) return <Badge className="bg-gray-400 hover:bg-gray-500">🥈 2nd</Badge>;
    if (index === 2) return <Badge className="bg-amber-600 hover:bg-amber-700">🥉 3rd</Badge>;
    return null;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <Skeleton className="h-12 w-64 mb-4" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-96 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const polls = pollsData?.polls || [];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold">Voting</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Vote for your favorite songs, albums, and artists
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {(['all', 'song', 'album', 'artist'] as const).map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(cat)}
              className="gap-2"
            >
              {cat !== 'all' && getCategoryIcon(cat)}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
              {cat !== 'all' && (
                <Badge variant="secondary" className="ml-1">
                  {polls.filter(p => p.category === cat).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>

        {/* User's Direct Votes Section */}
        {user && userItemVotesData && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center gap-3">
                <Heart className="w-6 h-6 text-red-500" />
                <div>
                  <CardTitle>My Votes</CardTitle>
                  <CardDescription>
                    Your favorite picks (max 2 per category)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {/* Songs */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Songs ({userItemVotesData.votes.song?.length || 0}/2)
                  </h3>
                  <div className="space-y-2">
                    {userItemVotesData.votes.song?.length ? (
                      userItemVotesData.votes.song.map((songId) => (
                        <VotedItemCard key={songId} type="song" itemId={songId} />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No songs voted yet</p>
                    )}
                  </div>
                </div>

                {/* Albums */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Disc className="w-4 h-4" />
                    Albums ({userItemVotesData.votes.album?.length || 0}/2)
                  </h3>
                  <div className="space-y-2">
                    {userItemVotesData.votes.album?.length ? (
                      userItemVotesData.votes.album.map((albumId) => (
                        <VotedItemCard key={albumId} type="album" itemId={albumId} />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No albums voted yet</p>
                    )}
                  </div>
                </div>

                {/* Artists */}
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Mic2 className="w-4 h-4" />
                    Artists ({userItemVotesData.votes.artist?.length || 0}/2)
                  </h3>
                  <div className="space-y-2">
                    {userItemVotesData.votes.artist?.length ? (
                      userItemVotesData.votes.artist.map((artistId) => (
                        <VotedItemCard key={artistId} type="artist" itemId={artistId} />
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No artists voted yet</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Voted Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <div>
                <CardTitle className="flex items-center gap-2">
                  Top Voted
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Trending
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Most voted songs, albums, and artists
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topVotedLoading ? (
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-64 w-full" />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                {/* Top Songs */}
                {(selectedCategory === 'all' || selectedCategory === 'song') && topVotedData?.top.song && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                      <Music className="w-5 h-5 text-primary" />
                      Top Songs
                    </h3>
                    <div className="space-y-2">
                      {topVotedData.top.song.map((song, index) => (
                        <TopVotedItemCard
                          key={song.id}
                          type="song"
                          item={song}
                          rank={index + 1}
                        />
                      ))}
                      {topVotedData.top.song.length === 0 && (
                        <p className="text-sm text-muted-foreground">No votes yet</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Top Albums */}
                {(selectedCategory === 'all' || selectedCategory === 'album') && topVotedData?.top.album && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                      <Disc className="w-5 h-5 text-primary" />
                      Top Albums
                    </h3>
                    <div className="space-y-2">
                      {topVotedData.top.album.map((album, index) => (
                        <TopVotedItemCard
                          key={album.id}
                          type="album"
                          item={album}
                          rank={index + 1}
                        />
                      ))}
                      {topVotedData.top.album.length === 0 && (
                        <p className="text-sm text-muted-foreground">No votes yet</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Top Artists */}
                {(selectedCategory === 'all' || selectedCategory === 'artist') && topVotedData?.top.artist && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                      <Mic2 className="w-5 h-5 text-primary" />
                      Top Artists
                    </h3>
                    <div className="space-y-2">
                      {topVotedData.top.artist.map((artist, index) => (
                        <TopVotedItemCard
                          key={artist.id}
                          type="artist"
                          item={artist}
                          rank={index + 1}
                        />
                      ))}
                      {topVotedData.top.artist.length === 0 && (
                        <p className="text-sm text-muted-foreground">No votes yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Polls */}
        {polls.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Vote className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No active polls</h3>
              <p className="text-muted-foreground">Check back later for new voting opportunities!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8">
            {polls.map((poll) => {
              const userVote = getUserVoteForPoll(poll.poll_id);
              const hasVoted = !!userVote;

              return (
                <Card key={poll.poll_id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(poll.category)}
                        <div>
                          <CardTitle className="text-2xl">
                            {getCategoryLabel(poll.category, poll.period)}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {poll.period}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {poll.total_votes} votes
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      {hasVoted && (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          You voted
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-4">
                      {poll.nominees.map((nominee, index) => {
                        const isUserChoice = userVote?.nominee_id === nominee.item_id;

                        return (
                          <div
                            key={nominee.SK}
                            className={`p-4 border rounded-lg transition-all ${
                              isUserChoice 
                                ? 'border-primary bg-primary/5 shadow-md' 
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="flex items-center gap-4">
                              {/* Image */}
                              {nominee.image && (
                                <img
                                  src={nominee.image}
                                  alt={nominee.name}
                                  className="w-16 h-16 object-cover rounded-md"
                                />
                              )}

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {getRankBadge(index)}
                                  {isUserChoice && (
                                    <Badge variant="default" className="text-xs">Your Vote</Badge>
                                  )}
                                </div>
                                <h4 className="font-semibold text-lg truncate">{nominee.name}</h4>
                                {nominee.artist_name && (
                                  <p className="text-sm text-muted-foreground truncate">
                                    {nominee.artist_name}
                                  </p>
                                )}
                              </div>

                              {/* Vote Count & Button */}
                              <div className="text-right flex flex-col items-end gap-2">
                                <div className="text-right min-w-[80px]">
                                  <div className="text-2xl font-bold text-primary">
                                    {nominee.percentage.toFixed(1)}%
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {nominee.votes} votes
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant={hasVoted ? 'outline' : 'default'}
                                  disabled={hasVoted || voteMutation.isPending}
                                  onClick={() => handleVote(poll.poll_id, nominee.item_id)}
                                  className="w-24"
                                >
                                  {hasVoted ? 'Voted' : 'Vote'}
                                </Button>
                              </div>
                            </div>

                            {/* Progress Bar */}
                            <Progress value={nominee.percentage} className="mt-3 h-2" />
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// Component to display a voted item with remove button
function VotedItemCard({ type, itemId }: { type: 'song' | 'album' | 'artist'; itemId: number }) {
  const { data: item, isLoading } = useQuery({
    queryKey: [type, itemId],
    queryFn: async () => {
      if (type === 'song') return getSongById(itemId);
      if (type === 'album') return getAlbumById(itemId);
      return getArtistById(itemId);
    },
  });

  if (isLoading) {
    return <Skeleton className="h-16 w-full" />;
  }

  if (!item) {
    return null;
  }

  const getItemName = () => {
    if (type === 'song') return (item as any).title;
    return (item as any).name;
  };

  const getItemImage = () => {
    if (type === 'song') return (item as any).song_art_image_url;
    if (type === 'album') return (item as any).cover_art_url;
    return (item as any).image_url;
  };

  const getItemSubtitle = () => {
    if (type === 'song') return (item as any).primary_artist_name;
    if (type === 'album') return (item as any).artist_name;
    return null;
  };

  return (
    <div className="flex items-center gap-2 p-2 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
      <img
        src={getItemImage()}
        alt={getItemName()}
        className="w-12 h-12 object-cover rounded"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{getItemName()}</p>
        {getItemSubtitle() && (
          <p className="text-xs text-muted-foreground truncate">{getItemSubtitle()}</p>
        )}
      </div>
      <VoteButton type={type} itemId={itemId} variant="icon" showCount={false} />
    </div>
  );
}

// Component to display a top voted item
function TopVotedItemCard({ 
  type, 
  item, 
  rank 
}: { 
  type: 'song' | 'album' | 'artist'; 
  item: any;
  rank: number;
}) {
  const getRankBadge = () => {
    if (rank === 1) return <Crown className="w-4 h-4 text-yellow-500" />;
    if (rank === 2) return <Badge variant="secondary" className="text-xs">2nd</Badge>;
    if (rank === 3) return <Badge variant="secondary" className="text-xs">3rd</Badge>;
    return <Badge variant="outline" className="text-xs">{rank}th</Badge>;
  };

  const getItemName = () => {
    if (type === 'song') return item.title;
    return item.name;
  };

  const getItemImage = () => {
    if (type === 'song') return item.song_art_image_url;
    if (type === 'album') return item.cover_art_url;
    return item.image_url;
  };

  const getItemSubtitle = () => {
    if (type === 'song') return item.primary_artist_name;
    if (type === 'album') return item.artist_name;
    return null;
  };

  return (
    <div className={`flex items-center gap-3 p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors ${
      rank === 1 ? 'border-yellow-500/50 bg-yellow-500/5' : ''
    }`}>
      <div className="flex-shrink-0 w-6 flex items-center justify-center">
        {getRankBadge()}
      </div>
      <img
        src={getItemImage()}
        alt={getItemName()}
        className="w-14 h-14 object-cover rounded"
      />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{getItemName()}</p>
        {getItemSubtitle() && (
          <p className="text-xs text-muted-foreground truncate">{getItemSubtitle()}</p>
        )}
        <div className="flex items-center gap-1 mt-1">
          <Heart className="w-3 h-3 text-red-500 fill-current" />
          <span className="text-xs font-medium text-primary">{item.vote_count} votes</span>
        </div>
      </div>
      <VoteButton type={type} itemId={item.id} variant="icon" showCount={false} />
    </div>
  );
}



