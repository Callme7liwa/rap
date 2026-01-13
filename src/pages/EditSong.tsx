import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSongById } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useOwnsContent } from '@/hooks/useArtistOwnership';
import { authenticatedFetch } from '@/lib/auth-helper';
import { UserDebugInfo } from '@/components/UserDebugInfo';

export default function EditSong() {
  const { id } = useParams<{ id: string }>();
  const songId = parseInt(id || '0');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: songData, isLoading } = useQuery({
    queryKey: ['song', songId],
    queryFn: async () => {
      const response = await fetch(`${import.meta.env.VITE_API_BASE || ''}/api/songs/${songId}`);
      if (!response.ok) throw new Error('Failed to fetch song');
      return response.json();
    },
    enabled: !!songId,
  });

  const song = songData?.song;
  const isOwned = useOwnsContent(song?.primary_artist_id);

  const [formData, setFormData] = useState({
    title: '',
    lyrics: '',
    song_art_image_url: '',
    apple_music_player_url: '',
    spotify_url: '',
    youtube_url: '',
    instrumental: false,
  });

  useEffect(() => {
    if (song) {
      setFormData({
        title: song.title || '',
        lyrics: song.lyrics || '',
        song_art_image_url: song.song_art_image_url || '',
        apple_music_player_url: song.apple_music_player_url || '',
        spotify_url: song.spotify_url || '',
        youtube_url: song.youtube_url || '',
        instrumental: song.instrumental || false,
      });
    }
  }, [song]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await authenticatedFetch(`${import.meta.env.VITE_API_BASE || ''}/api/artist-content/songs/${songId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error Response:', error);
        
        // Create detailed error message
        let message = error.message || error.error || `Failed to update song (${response.status})`;
        if (error.debug) {
          console.log('Debug info:', error.debug);
          message += `\n\nDebug: ${JSON.stringify(error.debug, null, 2)}`;
        }
        throw new Error(message);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song', songId] });
      toast.success('Song updated successfully!');
      navigate(`/songs/${songId}`);
    },
    onError: (error: Error) => {
      console.error('Update song error:', error);
      
      // Try to parse error message for better user feedback
      const errorMessage = error.message || 'Failed to update song';
      
      if (errorMessage.includes('403') || errorMessage.includes('Access denied')) {
        toast.error('You do not have permission to edit this song. Only the associated artist can edit their songs.');
      } else if (errorMessage.includes('401') || errorMessage.includes('Authentication')) {
        toast.error('Your session has expired. Please login again.');
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedFetch(`${import.meta.env.VITE_API_BASE || ''}/api/artist-content/songs/${songId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to delete song');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Song deleted successfully!');
      navigate('/songs');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete song');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this song? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <Skeleton className="h-12 w-64 mb-8" />
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!song || !isOwned) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You don't have permission to edit this song</p>
          <Button onClick={() => navigate(`/songs/${songId}`)}>
            Back to Song
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <UserDebugInfo />
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/songs/${songId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold">Edit Song</h1>
              <p className="text-muted-foreground">Update your song information</p>
            </div>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass rounded-xl p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="title">Song Title *</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  placeholder="Enter song title"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lyrics">Lyrics</Label>
                <Textarea
                  id="lyrics"
                  name="lyrics"
                  value={formData.lyrics}
                  onChange={handleChange}
                  placeholder="Enter song lyrics"
                  rows={12}
                  className="font-mono"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="instrumental"
                  checked={formData.instrumental}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, instrumental: checked }))}
                />
                <Label htmlFor="instrumental">This is an instrumental track (no lyrics)</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="song_art_image_url">Song Artwork URL</Label>
                <Input
                  id="song_art_image_url"
                  name="song_art_image_url"
                  value={formData.song_art_image_url}
                  onChange={handleChange}
                  placeholder="https://example.com/artwork.jpg"
                  type="url"
                />
                {formData.song_art_image_url && (
                  <div className="mt-2">
                    <img
                      src={formData.song_art_image_url}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Streaming Links</h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="spotify_url">Spotify URL</Label>
                    <Input
                      id="spotify_url"
                      name="spotify_url"
                      value={formData.spotify_url}
                      onChange={handleChange}
                      placeholder="https://open.spotify.com/track/..."
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apple_music_player_url">Apple Music URL</Label>
                    <Input
                      id="apple_music_player_url"
                      name="apple_music_player_url"
                      value={formData.apple_music_player_url}
                      onChange={handleChange}
                      placeholder="https://music.apple.com/..."
                      type="url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="youtube_url">YouTube URL</Label>
                    <Input
                      id="youtube_url"
                      name="youtube_url"
                      value={formData.youtube_url}
                      onChange={handleChange}
                      placeholder="https://www.youtube.com/watch?v=..."
                      type="url"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/songs/${songId}`)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="gap-2"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
