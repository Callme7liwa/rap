import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Music, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-client";

export default function AddArtist() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    bio: "",
    genre: "",
    country: "",
    image_url: "",
    header_image_url: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/artists', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name,
          bio: formData.bio,
          image_url: formData.image_url || undefined,
          header_image_url: formData.header_image_url || undefined,
        }),
      });

      toast({
        title: "Artist Added!",
        description: `${formData.name} has been added successfully.`,
      });

      // Reset form
      setFormData({
        name: "",
        bio: "",
        genre: "",
        country: "",
        image_url: "",
        header_image_url: "",
      });

      // Navigate to artists page
      setTimeout(() => {
        navigate("/artists");
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to add artist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            variant="ghost"
            onClick={() => navigate("/artists")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Artists
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-none bg-primary flex items-center justify-center">
              <Music className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">
                Add New Artist
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create a new artist profile
              </p>
            </div>
          </div>
        </motion.div>

        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass rounded-none p-8 shadow-hard">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image URLs */}
              <div className="space-y-2">
                <Label htmlFor="image_url">Artist Image URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  placeholder="https://images.genius.com/artist.jpg"
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, image_url: e.target.value })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Paste an external image URL. File uploads are disabled.
                </p>
                {formData.image_url && (
                  <div className="relative w-32 h-32 overflow-hidden border">
                    <img
                      src={formData.image_url}
                      alt="Artist preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="header_image_url">Header Image URL</Label>
                <Input
                  id="header_image_url"
                  type="url"
                  placeholder="https://images.genius.com/header.jpg"
                  value={formData.header_image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, header_image_url: e.target.value })
                  }
                />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Artist Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="e.g., Drake"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>

              {/* Genre */}
              <div className="space-y-2">
                <Label htmlFor="genre">Genre *</Label>
                <Input
                  id="genre"
                  type="text"
                  placeholder="e.g., Hip Hop, R&B"
                  value={formData.genre}
                  onChange={(e) =>
                    setFormData({ ...formData, genre: e.target.value })
                  }
                  required
                />
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country *</Label>
                <Input
                  id="country"
                  type="text"
                  placeholder="e.g., United States"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
                  required
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about the artist..."
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/artists")}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-none"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Add Artist
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
