import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAlbumById } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useOwnsContent } from '@/hooks/useArtistOwnership';
import { authenticatedFetch } from '@/lib/auth-helper';

export default function EditAlbum() {
  const { id } = useParams<{ id: string }>();
  const albumId = parseInt(id || '0');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: album, isLoading } = useQuery({
    queryKey: ['album', albumId],
    queryFn: () => getAlbumById(albumId),
    enabled: !!albumId,
  });

  const isOwned = useOwnsContent(album?.artist_id);

  const [formData, setFormData] = useState({
    name: '',
    cover_art_url: '',
    release_date_for_display: '',
  });

  useEffect(() => {
    if (album) {
      setFormData({
        name: album.name || '',
        cover_art_url: album.cover_art_url || '',
        release_date_for_display: album.release_date_for_display || '',
      });
    }
  }, [album]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await authenticatedFetch(`${import.meta.env.VITE_API_BASE || ''}/api/artist-content/albums/${albumId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to update album');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['album', albumId] });
      toast.success('Album updated successfully!');
      navigate(`/albums/${albumId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update album');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedFetch(`${import.meta.env.VITE_API_BASE || ''}/api/artist-content/albums/${albumId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || error.error || 'Failed to delete album');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Album deleted successfully!');
      navigate('/albums');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete album');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
            {[...Array(4)].map((_, i) => (
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

  if (!album || !isOwned) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You don't have permission to edit this album</p>
          <Button onClick={() => navigate(`/albums/${albumId}`)}>
            Back to Album
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/albums/${albumId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="font-display text-3xl font-bold">Edit Album</h1>
              <p className="text-muted-foreground">Update your album information</p>
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
                <Label htmlFor="name">Album Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter album name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="release_date_for_display">Release Date</Label>
                <Input
                  id="release_date_for_display"
                  name="release_date_for_display"
                  value={formData.release_date_for_display}
                  onChange={handleChange}
                  placeholder="e.g., January 1, 2024"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a display format like "January 1, 2024" or "2024"
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cover_art_url">Cover Art URL</Label>
                <Input
                  id="cover_art_url"
                  name="cover_art_url"
                  value={formData.cover_art_url}
                  onChange={handleChange}
                  placeholder="https://example.com/cover.jpg"
                  type="url"
                />
                {formData.cover_art_url && (
                  <div className="mt-2">
                    <img
                      src={formData.cover_art_url}
                      alt="Preview"
                      className="w-48 h-48 object-cover rounded-lg"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/albums/${albumId}`)}
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
