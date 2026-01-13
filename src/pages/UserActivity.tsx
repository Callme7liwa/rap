import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Heart, MessageSquare, Bookmark, CheckCircle, Upload, ArrowLeft, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { fetchAuthSession } from 'aws-amplify/auth';

interface UserActivity {
  likes: BlogLike[];
  comments: BlogComment[];
  savedPosts: SavedPost[];
  votes: UserVote[];
  uploads: UserUpload[];
  likedArtists: LikedArtist[];
  likedAlbums: LikedAlbum[];
  likedSongs: LikedSong[];
}

interface BlogLike {
  like_id: string;
  post_slug: string;
  post_title: string;
  created_at: number;
}

interface BlogComment {
  comment_id: string;
  post_slug: string;
  post_title: string;
  content: string;
  created_at: number;
}

interface SavedPost {
  saved_id: string;
  post_slug: string;
  post_title: string;
  saved_at: number;
}

interface UserVote {
  vote_id: string;
  event_title: string;
  selected_option: string;
  voted_at: number;
}

interface UserUpload {
  upload_id: string;
  filename: string;
  category: string;
  size: number;
  created_at: number;
}

interface LikedArtist {
  artist_id: string;
  name: string;
  image_url: string;
  liked_at: number;
}

interface LikedAlbum {
  album_id: string;
  title: string;
  artist_name: string;
  cover_url: string;
  liked_at: number;
}

interface LikedSong {
  song_id: string;
  title: string;
  artist_name: string;
  album_title?: string;
  liked_at: number;
}

export default function UserActivity() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activity, setActivity] = useState<UserActivity>({
    likes: [],
    comments: [],
    savedPosts: [],
    votes: [],
    uploads: [],
    likedArtists: [],
    likedAlbums: [],
    likedSongs: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadActivity();
  }, []);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/user/activity`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load activity');
      }

      const data = await response.json();
      setActivity(data);
    } catch (error) {
      console.error('Error loading activity:', error);
      toast({
        title: 'Error',
        description: 'Failed to load your activity',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const StatCard = ({ icon: Icon, label, count, color }: any) => (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        </div>
      </div>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading activity...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="container mx-auto max-w-7xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              My Activity
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            View all your interactions and contributions
          </p>
        </motion.div>

        {/* Stats Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8"
        >
          <StatCard icon={Heart} label="Blog Likes" count={activity.likes.length} color="bg-red-500" />
          <StatCard icon={MessageSquare} label="Comments" count={activity.comments.length} color="bg-blue-500" />
          <StatCard icon={Bookmark} label="Saved" count={activity.savedPosts.length} color="bg-yellow-500" />
          <StatCard icon={CheckCircle} label="Votes" count={activity.votes.length} color="bg-green-500" />
          <StatCard icon={Heart} label="Content Likes" count={activity.likedArtists.length + activity.likedAlbums.length + activity.likedSongs.length} color="bg-pink-500" />
        </motion.div>

        {/* Activity Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 lg:grid-cols-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="likes">Blog Likes</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
              <TabsTrigger value="saved">Saved</TabsTrigger>
              <TabsTrigger value="votes">Votes</TabsTrigger>
              <TabsTrigger value="artists">Artists</TabsTrigger>
              <TabsTrigger value="albums">Albums</TabsTrigger>
              <TabsTrigger value="songs">Songs</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-4 mt-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {activity.comments.slice(0, 3).map((comment) => (
                    <div key={comment.comment_id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <MessageSquare className="w-5 h-5 text-blue-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white font-medium">{comment.post_title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{comment.content}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(comment.created_at)}</p>
                      </div>
                    </div>
                  ))}
                  
                  {activity.likes.slice(0, 2).map((like) => (
                    <div key={like.like_id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <Heart className="w-5 h-5 text-red-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 dark:text-white">Liked: {like.post_title}</p>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(like.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* Likes Tab */}
            <TabsContent value="likes" className="space-y-4 mt-6">
              {activity.likes.length === 0 ? (
                <Card className="p-12 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-400">No likes yet</p>
                </Card>
              ) : (
                activity.likes.map((like) => (
                  <Card key={like.like_id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/blog/${like.post_slug}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{like.post_title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(like.created_at)}</p>
                      </div>
                      <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Comments Tab */}
            <TabsContent value="comments" className="space-y-4 mt-6">
              {activity.comments.length === 0 ? (
                <Card className="p-12 text-center">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-400">No comments yet</p>
                </Card>
              ) : (
                activity.comments.map((comment) => (
                  <Card key={comment.comment_id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/blog/${comment.post_slug}`)}>
                    <h3 className="text-lg font-semibold mb-2">{comment.post_title}</h3>
                    <p className="text-gray-700 dark:text-gray-300 mb-3">{comment.content}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(comment.created_at)}</p>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Saved Tab */}
            <TabsContent value="saved" className="space-y-4 mt-6">
              {activity.savedPosts.length === 0 ? (
                <Card className="p-12 text-center">
                  <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-400">No saved posts yet</p>
                </Card>
              ) : (
                activity.savedPosts.map((saved) => (
                  <Card key={saved.saved_id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/blog/${saved.post_slug}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{saved.post_title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Saved: {formatDate(saved.saved_at)}</p>
                      </div>
                      <Bookmark className="w-6 h-6 text-yellow-500 fill-yellow-500" />
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Votes Tab */}
            <TabsContent value="votes" className="space-y-4 mt-6">
              {activity.votes.length === 0 ? (
                <Card className="p-12 text-center">
                  <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-400">No votes yet</p>
                  <Button className="mt-4" onClick={() => navigate('/voting')}>
                    Go to Voting
                  </Button>
                </Card>
              ) : (
                activity.votes.map((vote) => (
                  <Card key={vote.vote_id} className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1">{vote.event_title}</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-1">Your vote: <span className="text-primary font-medium">{vote.selected_option}</span></p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(vote.voted_at)}</p>
                      </div>
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>

            {/* Liked Artists Tab */}
            <TabsContent value="artists" className="space-y-4 mt-6">
              {activity.likedArtists.length === 0 ? (
                <Card className="p-12 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-400">No liked artists yet</p>
                  <Button className="mt-4" onClick={() => navigate('/artists')}>
                    Browse Artists
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activity.likedArtists.map((artist) => (
                    <Card key={artist.artist_id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/artists/${artist.artist_id}`)}>
                      <div className="flex items-center gap-4">
                        <img
                          src={artist.image_url}
                          alt={artist.name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{artist.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{formatDate(artist.liked_at)}</p>
                        </div>
                        <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Liked Albums Tab */}
            <TabsContent value="albums" className="space-y-4 mt-6">
              {activity.likedAlbums.length === 0 ? (
                <Card className="p-12 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-400">No liked albums yet</p>
                  <Button className="mt-4" onClick={() => navigate('/albums')}>
                    Browse Albums
                  </Button>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activity.likedAlbums.map((album) => (
                    <Card key={album.album_id} className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/albums/${album.album_id}`)}>
                      <div className="flex items-start gap-4">
                        <img
                          src={album.cover_url}
                          alt={album.title}
                          className="w-20 h-20 rounded-lg object-cover"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{album.title}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{album.artist_name}</p>
                          <p className="text-xs text-gray-500">{formatDate(album.liked_at)}</p>
                        </div>
                        <Heart className="w-5 h-5 text-red-500 fill-red-500 flex-shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Liked Songs Tab */}
            <TabsContent value="songs" className="space-y-4 mt-6">
              {activity.likedSongs.length === 0 ? (
                <Card className="p-12 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 opacity-50 text-gray-400" />
                  <p className="text-gray-400">No liked songs yet</p>
                  <Button className="mt-4" onClick={() => navigate('/songs')}>
                    Browse Songs
                  </Button>
                </Card>
              ) : (
                activity.likedSongs.map((song) => (
                  <Card key={song.song_id} className="p-6 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(`/songs/${song.song_id}`)}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold mb-1 text-gray-900 dark:text-white">{song.title}</h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-1">{song.artist_name}</p>
                        {song.album_title && (
                          <p className="text-sm text-gray-500 mb-2">Album: {song.album_title}</p>
                        )}
                        <p className="text-xs text-gray-500">{formatDate(song.liked_at)}</p>
                      </div>
                      <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
