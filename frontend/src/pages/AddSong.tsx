import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Music2, ArrowLeft, Save, Plus, X } from "lucide-react";
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

export default function AddSong() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    artist: "",
    album: "",
    duration: "",
    genre: "",
    releaseDate: "",
    lyrics: "",
    song_art_image_url: "",
    audioFile: null as File | null,
    featuredArtists: [] as string[],
    producers: [] as string[],
  });

  const [newFeaturedArtist, setNewFeaturedArtist] = useState("");
  const [newProducer, setNewProducer] = useState("");

  // TODO: Fetch from API
  const artists = [
    "Drake",
    "Kendrick Lamar",
    "Travis Scott",
    "The Weeknd",
    "Post Malone",
  ];

  const albums = [
    "Certified Lover Boy",
    "Scorpion",
    "Take Care",
    "Nothing Was The Same",
  ];

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, audioFile: file });
    }
  };

  const addFeaturedArtist = () => {
    if (newFeaturedArtist.trim()) {
      setFormData({
        ...formData,
        featuredArtists: [...formData.featuredArtists, newFeaturedArtist],
      });
      setNewFeaturedArtist("");
    }
  };

  const removeFeaturedArtist = (index: number) => {
    setFormData({
      ...formData,
      featuredArtists: formData.featuredArtists.filter((_, i) => i !== index),
    });
  };

  const addProducer = () => {
    if (newProducer.trim()) {
      setFormData({
        ...formData,
        producers: [...formData.producers, newProducer],
      });
      setNewProducer("");
    }
  };

  const removeProducer = (index: number) => {
    setFormData({
      ...formData,
      producers: formData.producers.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await apiRequest('/songs', {
        method: 'POST',
        body: JSON.stringify({
          title: formData.title,
          lyrics: formData.lyrics,
          song_art_image_url: formData.song_art_image_url || undefined,
          release_date: formData.releaseDate,
        }),
      });

      toast({
        title: "Song Added!",
        description: `"${formData.title}" has been added successfully.`,
      });

      // Reset form
      setFormData({
        title: "",
        artist: "",
        album: "",
        duration: "",
        genre: "",
        releaseDate: "",
        lyrics: "",
        song_art_image_url: "",
        audioFile: null,
        featuredArtists: [],
        producers: [],
      });

      // Navigate to songs page
      setTimeout(() => {
        navigate("/songs");
      }, 1000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add song. Please try again.",
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
            onClick={() => navigate("/songs")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Songs
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-none bg-primary flex items-center justify-center">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-primary">
                Add New Song
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Create a new song entry
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
                <Label htmlFor="song_art_image_url">Song Cover Art URL</Label>
                <Input
                  id="song_art_image_url"
                  type="url"
                  placeholder="https://images.genius.com/song-cover.jpg"
                  value={formData.song_art_image_url}
                  onChange={(e) =>
                    setFormData({ ...formData, song_art_image_url: e.target.value })
                  }
                />
                <p className="text-sm text-gray-500 mt-1">
                  Paste an external cover image URL. File uploads are disabled.
                </p>
                {formData.song_art_image_url && (
                  <div className="relative w-32 h-32 overflow-hidden border">
                    <img
                      src={formData.song_art_image_url}
                      alt="Song cover preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Audio File Upload */}
              <div className="space-y-2">
                <Label htmlFor="audioFile">Audio File</Label>
                <Input
                  id="audioFile"
                  type="file"
                  accept="audio/*"
                  onChange={handleAudioChange}
                  className="cursor-pointer"
                />
                {formData.audioFile && (
                  <p className="text-sm text-green-600">
                    ✓ {formData.audioFile.name}
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Song Title *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="e.g., God's Plan"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                />
              </div>

              {/* Artist */}
              <div className="space-y-2">
                <Label htmlFor="artist">Main Artist *</Label>
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

              {/* Featured Artists */}
              <div className="space-y-2">
                <Label>Featured Artists</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add featured artist"
                    value={newFeaturedArtist}
                    onChange={(e) => setNewFeaturedArtist(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeaturedArtist())}
                  />
                  <Button
                    type="button"
                    onClick={addFeaturedArtist}
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.featuredArtists.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.featuredArtists.map((artist, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-primary/10 px-3 py-1 rounded-sm text-sm"
                      >
                        <span>{artist}</span>
                        <button
                          type="button"
                          onClick={() => removeFeaturedArtist(index)}
                          className="text-primary hover:text-primary/80"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Album */}
              <div className="space-y-2">
                <Label htmlFor="album">Album</Label>
                <Select
                  value={formData.album}
                  onValueChange={(value) =>
                    setFormData({ ...formData, album: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an album (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {albums.map((album) => (
                      <SelectItem key={album} value={album}>
                        {album}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration *</Label>
                <Input
                  id="duration"
                  type="text"
                  placeholder="e.g., 3:18"
                  value={formData.duration}
                  onChange={(e) =>
                    setFormData({ ...formData, duration: e.target.value })
                  }
                  required
                />
              </div>

              {/* Genre & Release Date */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="genre">Genre *</Label>
                  <Input
                    id="genre"
                    type="text"
                    placeholder="e.g., Hip Hop"
                    value={formData.genre}
                    onChange={(e) =>
                      setFormData({ ...formData, genre: e.target.value })
                    }
                    required
                  />
                </div>
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
              </div>

              {/* Producers */}
              <div className="space-y-2">
                <Label>Producers</Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Add producer"
                    value={newProducer}
                    onChange={(e) => setNewProducer(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addProducer())}
                  />
                  <Button
                    type="button"
                    onClick={addProducer}
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {formData.producers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.producers.map((producer, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-secondary px-3 py-1 rounded-sm text-sm"
                      >
                        <span>{producer}</span>
                        <button
                          type="button"
                          onClick={() => removeProducer(index)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lyrics */}
              <div className="space-y-2">
                <Label htmlFor="lyrics">Lyrics</Label>
                <Textarea
                  id="lyrics"
                  placeholder="Enter song lyrics..."
                  value={formData.lyrics}
                  onChange={(e) =>
                    setFormData({ ...formData, lyrics: e.target.value })
                  }
                  rows={10}
                  className="resize-none font-mono text-sm"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/songs")}
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
                      Add Song
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
