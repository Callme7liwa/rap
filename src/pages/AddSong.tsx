import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Music2, Upload, ArrowLeft, Save, Plus, X } from "lucide-react";
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
import { fetchAuthSession } from "aws-amplify/auth";

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
    coverArt: null as File | null,
    audioFile: null as File | null,
    featuredArtists: [] as string[],
    producers: [] as string[],
  });

  const [coverPreview, setCoverPreview] = useState<string>("");
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

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, coverArt: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

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
      // Get authentication token
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();
      
      if (!token) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to add a song.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const formDataToSend = new FormData();
      formDataToSend.append('title', formData.title);
      formDataToSend.append('artist', formData.artist);
      formDataToSend.append('album', formData.album);
      formDataToSend.append('duration', formData.duration);
      formDataToSend.append('genre', formData.genre);
      formDataToSend.append('releaseDate', formData.releaseDate);
      formDataToSend.append('lyrics', formData.lyrics);
      formDataToSend.append('featuredArtists', JSON.stringify(formData.featuredArtists));
      formDataToSend.append('producers', JSON.stringify(formData.producers));
      if (formData.coverArt) {
        formDataToSend.append('coverArt', formData.coverArt);
      }
      if (formData.audioFile) {
        formDataToSend.append('audioFile', formData.audioFile);
      }

      const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/songs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formDataToSend,
      });

      if (!response.ok) {
        throw new Error('Failed to add song');
      }

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
        coverArt: null,
        audioFile: null,
        featuredArtists: [],
        producers: [],
      });
      setCoverPreview("");

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12">
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
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
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
          <div className="glass rounded-2xl p-8 shadow-xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Cover Art Upload */}
              <div className="space-y-2">
                <Label htmlFor="coverArt">Song Cover Art</Label>
                <div className="flex items-center gap-4">
                  {coverPreview ? (
                    <div className="relative w-32 h-32 rounded-lg overflow-hidden">
                      <img
                        src={coverPreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Input
                      id="coverArt"
                      type="file"
                      accept="image/*"
                      onChange={handleCoverChange}
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Recommended: Square image, at least 1000x1000px
                    </p>
                  </div>
                </div>
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
                        className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-900 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{artist}</span>
                        <button
                          type="button"
                          onClick={() => removeFeaturedArtist(index)}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
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
                        className="flex items-center gap-1 bg-purple-100 dark:bg-purple-900 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{producer}</span>
                        <button
                          type="button"
                          onClick={() => removeProducer(index)}
                          className="text-purple-600 dark:text-purple-400 hover:text-purple-800"
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
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
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
