import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getArtistById } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useOwnsArtist } from '@/hooks/useArtistOwnership';
import { apiRequest } from '@/lib/api-client';

export default function EditArtist() {
  const { id } = useParams<{ id: string }>();
  const artistId = parseInt(id || '0');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isOwned = useOwnsArtist(artistId);

  const { data: artist, isLoading } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtistById(artistId),
    enabled: !!artistId,
  });

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    header_image_url: '',
    instagram_name: '',
    twitter_name: '',
    facebook_name: '',
  });

  useEffect(() => {
    if (artist) {
      setFormData({
        name: artist.name || '',
        description: artist.description_preview || '',
        image_url: artist.image_url || '',
        header_image_url: artist.header_image_url || '',
        instagram_name: artist.instagram_name || '',
        twitter_name: artist.twitter_name || '',
        facebook_name: artist.facebook_name || '',
      });
    }
  }, [artist]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest(`/artists/${artistId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: data.name,
          bio: data.description,
          image_url: data.image_url,
          header_image_url: data.header_image_url,
          instagram: data.instagram_name,
          twitter: data.twitter_name,
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['artist', artistId] });
      toast.success('Artist profile updated successfully!');
      navigate(`/artists/${artistId}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update artist');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
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
            {[...Array(7)].map((_, i) => (
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

  if (!artist || !isOwned) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="font-display text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">You don't have permission to edit this artist</p>
          <Button onClick={() => navigate(`/artists/${artistId}`)}>
            Back to Artist
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
              onClick={() => navigate(`/artists/${artistId}`)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-display text-3xl font-bold">Edit Artist Profile</h1>
              <p className="text-muted-foreground">Update your artist information</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="glass rounded-none p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Artist Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter artist name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter artist description"
                  rows={6}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="image_url">Profile Image URL</Label>
                  <Input
                    id="image_url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    type="url"
                  />
                  {formData.image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.image_url}
                        alt="Preview"
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="header_image_url">Header Image URL</Label>
                  <Input
                    id="header_image_url"
                    name="header_image_url"
                    value={formData.header_image_url}
                    onChange={handleChange}
                    placeholder="https://example.com/header.jpg"
                    type="url"
                  />
                  {formData.header_image_url && (
                    <div className="mt-2">
                      <img
                        src={formData.header_image_url}
                        alt="Preview"
                        className="w-full h-24 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold mb-4">Social Media</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="instagram_name">Instagram</Label>
                    <Input
                      id="instagram_name"
                      name="instagram_name"
                      value={formData.instagram_name}
                      onChange={handleChange}
                      placeholder="username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="twitter_name">Twitter</Label>
                    <Input
                      id="twitter_name"
                      name="twitter_name"
                      value={formData.twitter_name}
                      onChange={handleChange}
                      placeholder="username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="facebook_name">Facebook</Label>
                    <Input
                      id="facebook_name"
                      name="facebook_name"
                      value={formData.facebook_name}
                      onChange={handleChange}
                      placeholder="username"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/artists/${artistId}`)}
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
