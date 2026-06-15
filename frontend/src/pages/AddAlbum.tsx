import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Disc3, ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-client";

export default function AddAlbum() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    releaseDate: "",
    genre: "",
    description: "",
    recordLabel: "",
    cover_art_url: "",
  });

  // TODO: Fetch from API
  const artists = [
    "Drake",
    "Kendrick Lamar",
    "Travis Scott",
    "The Weeknd",
    "Post Malone",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/albums', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.title,
          cover_art_url: formData.cover_art_url || undefined,
          release_date: formData.releaseDate,
        }),
      });

      toast({
        title: "Album Added!",
        description: `"${formData.title}" has been added successfully.`,
      });

      // Reset form
      setFormData({
        title: "",
        artist: "",
        releaseDate: "",
        genre: "",
        description: "",
        recordLabel: "",
        cover_art_url: "",
      });

      // Navigate to albums page
      setTimeout(() => {
        navigate("/albums");
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add album. Please try again.",
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
            onClick={() => navigate("/albums")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Albums
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-none bg-primary flex items-center justify-center">
              <Disc3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">
                Add New Album
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create a new album entry
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
              {/* Cover Art URL */}
              <div className="space-y-2">
                <Label htmlFor="cover_art_url">Album Cover URL</Label>
                <Input
                  id="cover_art_url"
                  type="url"
                  placeholder="https://images.genius.com/cover.jpg"
                  value={formData.cover_art_url}
                  onChange={(e) =>
                    setFormData({ ...formData, cover_art_url: e.target.value })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Paste an external cover image URL. File uploads are disabled.
                </p>
                {formData.cover_art_url && (
                  <div className="relative w-32 h-32 overflow-hidden border">
                    <img
                      src={formData.cover_art_url}
                      alt="Album cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Album Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., Certified Lover Boy"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              {/* Artist */}
              <div className="space-y-2">
                <Label htmlFor="artist">Artist *</Label>
                <Select
                  value={formData.artist}
                  onValueChange={(value) =>
                    setFormData({ ...formData, artist: value })
                  }
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist} value={artist}>
                        {artist}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Release Date */}
              <div className="space-y-2">
                <Label htmlFor="releaseDate">Release Date *</Label>
                <Input
                  id="releaseDate"
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, releaseDate: e.target.value })
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

              {/* Record Label */}
              <div className="space-y-2">
                <Label htmlFor="recordLabel">Record Label</Label>
                <Input
                  id="recordLabel"
                  type="text"
                  placeholder="e.g., OVO Sound"
                  value={formData.recordLabel}
                  onChange={(e) =>
                    setFormData({ ...formData, recordLabel: e.target.value })
                  }
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about the album..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/albums")}
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
                      Add Album
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
