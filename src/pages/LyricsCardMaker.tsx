import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSongById, getArtistById, getArtists } from '@/lib/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toPng, toJpeg } from 'html-to-image';
import { Download, Wand2, Image as ImageIcon, Type, Palette, Maximize2, Move, Layers, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const templates = {
  geniusBox: {
    name: 'Genius Box',
    overlayGradient: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.1) 100%)',
    textColor: '#000000',
    footerBg: '#1a1a1a',
    fontFamily: 'Inter',
    fontSize: 16,
    footerFontSize: 10,
    textAlign: 'left' as const,
    textShadow: 'none',
    padding: 40,
    layoutType: 'geniusBox' as const,
    accentColor: '#3b82f6',
  },
  geniusClassic: {
    name: 'Classic Genius',
    overlayGradient: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)',
    textColor: '#ffffff',
    footerBg: 'rgba(0,0,0,0.8)',
    fontFamily: 'Inter',
    fontSize: 40,
    footerFontSize: 14,
    textAlign: 'center' as const,
    textShadow: '0 4px 12px rgba(0,0,0,0.8)',
    padding: 60,
  },
  minimalLight: {
    name: 'Minimal Light',
    overlayGradient: 'linear-gradient(to bottom, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.75) 100%)',
    textColor: '#1a1a1a',
    footerBg: 'rgba(255,255,255,0.9)',
    fontFamily: 'Georgia',
    fontSize: 36,
    footerFontSize: 13,
    textAlign: 'center' as const,
    textShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: 70,
  },
  neonMood: {
    name: 'Neon Mood',
    overlayGradient: 'linear-gradient(135deg, rgba(139,92,246,0.7) 0%, rgba(236,72,153,0.7) 100%)',
    textColor: '#ffffff',
    footerBg: 'rgba(88,28,135,0.9)',
    fontFamily: 'Inter Tight',
    fontSize: 44,
    footerFontSize: 15,
    textAlign: 'left' as const,
    textShadow: '0 0 20px rgba(236,72,153,0.8)',
    padding: 50,
  },
  filmPoster: {
    name: 'Film Poster',
    overlayGradient: 'linear-gradient(to right, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.7) 100%)',
    textColor: '#f5f5f5',
    footerBg: 'transparent',
    fontFamily: 'Inter Tight',
    fontSize: 48,
    footerFontSize: 12,
    textAlign: 'left' as const,
    textShadow: '0 6px 16px rgba(0,0,0,0.9)',
    padding: 55,
  },
  darkGlow: {
    name: 'Dark Glow',
    overlayGradient: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.85) 100%)',
    textColor: '#ffffff',
    footerBg: 'rgba(15,15,15,0.85)',
    fontFamily: 'Inter',
    fontSize: 38,
    footerFontSize: 13,
    textAlign: 'center' as const,
    textShadow: '0 0 30px rgba(99,102,241,0.6), 0 4px 12px rgba(0,0,0,0.8)',
    padding: 65,
  },
  vibrantSplit: {
    name: 'Vibrant Split',
    overlayGradient: 'linear-gradient(to bottom right, rgba(236,72,153,0.8) 0%, rgba(59,130,246,0.8) 100%)',
    textColor: '#ffffff',
    footerBg: 'rgba(0,0,0,0.7)',
    fontFamily: 'Inter Tight',
    fontSize: 42,
    footerFontSize: 14,
    textAlign: 'center' as const,
    textShadow: '0 4px 16px rgba(0,0,0,0.9)',
    padding: 58,
  },
};

const fonts = [
  { value: 'Inter', label: 'Inter' },
  { value: 'Inter Tight', label: 'Inter Tight (Display)' },
  { value: 'Georgia', label: 'Georgia (Serif)' },
];

export default function LyricsCardMaker() {
  const [searchParams] = useSearchParams();
  const songId = searchParams.get('song');
  const songIdFromParams = searchParams.get('songId');
  const artistIdFromParams = searchParams.get('artistId');
  const artistNameFromParams = searchParams.get('artistName');
  const songNameFromParams = searchParams.get('songName');
  const lyricsFromParams = searchParams.get('lyrics');
  
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: song } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => getSongById(parseInt(songId!)),
    enabled: !!songId,
  });

  // Charger tous les artistes pour le sélecteur
  const { data: artistsData } = useQuery({
    queryKey: ['artists', 'all'],
    queryFn: () => getArtists({ limit: 100 }),
  });

  const artists = artistsData?.data || [];

  const [quote, setQuote] = useState('');
  const [attribution, setAttribution] = useState('');
  const [artistName, setArtistName] = useState('');
  const [trackName, setTrackName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof templates>('geniusBox');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [imageScale, setImageScale] = useState(100);
  const [imagePositionX, setImagePositionX] = useState(50);
  const [imagePositionY, setImagePositionY] = useState(50);
  const [imageFit, setImageFit] = useState<'cover' | 'contain' | 'fill'>('cover');
  const [overlayOpacity, setOverlayOpacity] = useState(100);
  const [customFontSize, setCustomFontSize] = useState<number | null>(null);
  const [customAlignment, setCustomAlignment] = useState<'left' | 'center' | 'right' | null>(null);
  const [customFontStyle, setCustomFontStyle] = useState<'normal' | 'italic' | null>(null);
  const [customFontFamily, setCustomFontFamily] = useState<string | null>(null);
  const [boxPosition, setBoxPosition] = useState<'top' | 'bottom'>('top');
  const [showWatermark, setShowWatermark] = useState(true);
  const [watermarkText, setWatermarkText] = useState('GENIUS');
  const [showFooter, setShowFooter] = useState(true);
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [selectedRapper, setSelectedRapper] = useState<string | null>(null);
  const [rapperPhotos, setRapperPhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const template = templates[selectedTemplate];
  const fontSize = customFontSize ?? template.fontSize;
  const alignment = customAlignment ?? template.textAlign;
  const fontStyle = customFontStyle ?? 'normal';
  const fontFamily = customFontFamily ?? template.fontFamily;
  const currentAccentColor = (template as any).accentColor || accentColor;

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('lyricsCardSettings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        if (settings.selectedTemplate) setSelectedTemplate(settings.selectedTemplate);
        if (settings.backgroundImage) setBackgroundImage(settings.backgroundImage);
        if (settings.imageScale) setImageScale(settings.imageScale);
        if (settings.imagePositionX) setImagePositionX(settings.imagePositionX);
        if (settings.imagePositionY) setImagePositionY(settings.imagePositionY);
        if (settings.imageFit) setImageFit(settings.imageFit);
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    const settings = {
      selectedTemplate,
      backgroundImage,
      imageScale,
      imagePositionX,
      imagePositionY,
      imageFit,
    };
    localStorage.setItem('lyricsCardSettings', JSON.stringify(settings));
  }, [selectedTemplate, backgroundImage, imageScale, imagePositionX, imagePositionY, imageFit]);

  // Load rapper photos when rapper is selected
  useEffect(() => {
    if (selectedRapper) {
      const photos: string[] = [];

      // Find artist from loaded artists
      const artist = artists.find(a => a.name === selectedRapper);
      if (artist) {
        // Add profile and header images
        if (artist.image_url) photos.push(artist.image_url);
        if (artist.header_image_url) photos.push(artist.header_image_url);

        // Charger les songs de l'artiste pour les artwork
        getArtistById(artist.id).then(fullArtist => {
          if (fullArtist) {
            // Ici on devrait charger les songs de l'artiste
            // Pour l'instant on garde juste les images de l'artiste
          }
        });
      }

      setRapperPhotos(photos);
      setCurrentPhotoIndex(0);
      if (photos.length > 0) {
        setBackgroundImage(photos[0]);
      }
    }
  }, [selectedRapper, artists]);

  // Auto-fill form from URL params (when coming from song detail)
  useEffect(() => {
    if (artistNameFromParams && songNameFromParams && lyricsFromParams) {
      // Set the basic info
      setQuote(lyricsFromParams);
      setAttribution(`${artistNameFromParams} - ${songNameFromParams}`);
      setArtistName(artistNameFromParams);
      setTrackName(songNameFromParams);
      
      // Auto-select the rapper if name matches
      setSelectedRapper(artistNameFromParams);
      
      // Show success notification
      toast.success('Card pre-filled with selected lyrics!', {
        description: `${artistNameFromParams} - ${songNameFromParams}`
      });
    }
  }, [artistNameFromParams, songNameFromParams, lyricsFromParams]);

  const goToNextPhoto = () => {
    if (rapperPhotos.length > 0) {
      const nextIndex = (currentPhotoIndex + 1) % rapperPhotos.length;
      setCurrentPhotoIndex(nextIndex);
      setBackgroundImage(rapperPhotos[nextIndex]);
    }
  };

  const goToPreviousPhoto = () => {
    if (rapperPhotos.length > 0) {
      const prevIndex = currentPhotoIndex === 0 ? rapperPhotos.length - 1 : currentPhotoIndex - 1;
      setCurrentPhotoIndex(prevIndex);
      setBackgroundImage(rapperPhotos[prevIndex]);
    }
  };

  const exportCard = async (format: 'png' | 'jpeg', scale: number = 2) => {
    if (!canvasRef.current) return;

    try {
      const exportFn = format === 'png' ? toPng : toJpeg;
      const dataUrl = await exportFn(canvasRef.current, {
        quality: 1,
        pixelRatio: scale,
        cacheBust: true,
      });

      const artistName = attribution.split(' - ')[0] || 'artist';
      const songName = attribution.split(' - ')[1] || 'song';
      const filename = `${artistName.toLowerCase().replace(/\s+/g, '-')}-${songName.toLowerCase().replace(/\s+/g, '-')}-quote.${format}`;

      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();

      toast.success(`Card exported as ${format.toUpperCase()} at ${scale}x resolution!`);
    } catch (error) {
      toast.error('Failed to export card. Please try again.');
      console.error(error);
    }
  };

  const copyToClipboard = async () => {
    if (!canvasRef.current) return;

    try {
      const dataUrl = await toPng(canvasRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });

      const blob = await (await fetch(dataUrl)).blob();
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);

      toast.success('Card copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy to clipboard.');
      console.error(error);
    }
  };

  const uploadCardToS3 = async () => {
    if (!canvasRef.current) return;

    try {
      const dataUrl = await toPng(canvasRef.current, { quality: 1, pixelRatio: 2, cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();

      const form = new FormData();
      const filename = `${(artistName || 'artist').replace(/\s+/g,'-')}-${(trackName || 'track').replace(/\s+/g,'-')}-${Date.now()}.png`;
      form.append('file', blob, filename);
      form.append('category', 'lyrics-cards');
      form.append('visibility', 'private');

      // Use authenticated uploads API
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/uploads`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: form
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Upload failed');
        console.error('Upload error', json);
        return;
      }

      toast.success('Card uploaded successfully! Check "My Uploads" to view it.');
    } catch (error) {
      console.error('Upload to S3 failed:', error);
      toast.error('Failed to upload card. Please sign in first.');
    }
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Wand2 className="w-8 h-8 text-primary" />
            <h1>Lyrics Card Maker</h1>
          </div>
          <p className="text-muted-foreground">
            Create beautiful lyric quote cards to share on social media
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Type className="w-5 h-5 text-primary" />
                Content
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="quote">Lyric Quote (use line breaks for multiple boxes)</Label>
                  <Textarea
                    id="quote"
                    placeholder="Enter your favorite lyrics...&#10;Press Enter for new line/new box"
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    className="min-h-32"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Each line will appear in a separate white box (Genius Box template)
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="artistName">Artist Name</Label>
                    <Input
                      id="artistName"
                      placeholder="e.g., FETAH & VALEN"
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="trackName">Track Name</Label>
                    <Input
                      id="trackName"
                      placeholder="e.g., STONE STABLE"
                      value={trackName}
                      onChange={(e) => setTrackName(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="attribution">Attribution (for other templates)</Label>
                  <Input
                    id="attribution"
                    placeholder="e.g., Artist - Song"
                    value={attribution}
                    onChange={(e) => setAttribution(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for non-Genius Box templates
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <Tabs defaultValue="template">
                <TabsList className="grid grid-cols-4 mb-4">
                  <TabsTrigger value="template">
                    <Palette className="w-4 h-4 mr-2" />
                    Template
                  </TabsTrigger>
                  <TabsTrigger value="image">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Image
                  </TabsTrigger>
                  <TabsTrigger value="overlay">
                    <Layers className="w-4 h-4 mr-2" />
                    Overlay
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <Type className="w-4 h-4 mr-2" />
                    Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="template" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(templates).map(([key, tmpl]) => (
                      <button
                        key={key}
                        onClick={() => {
                          setSelectedTemplate(key as keyof typeof templates);
                          setCustomFontSize(null);
                          setCustomAlignment(null);
                        }}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedTemplate === key
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div
                          className="w-full h-16 rounded mb-2 relative overflow-hidden"
                          style={{ background: tmpl.overlayGradient }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div 
                              className="text-xs font-semibold" 
                              style={{ color: tmpl.textColor, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}
                            >
                              Aa
                            </div>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{tmpl.name}</p>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="image" className="space-y-4">
                  <div>
                    <Label htmlFor="rapperSelect">Quick Select Rapper (Auto-load photos)</Label>
                    <Select value={selectedRapper || ''} onValueChange={(v) => setSelectedRapper(v || null)}>
                      <SelectTrigger id="rapperSelect">
                        <SelectValue placeholder="Choose a rapper..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Manual selection)</SelectItem>
                        {artists.map((artist) => (
                          <SelectItem key={artist.id} value={artist.name}>
                            {artist.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedRapper && rapperPhotos.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {rapperPhotos.length} photo{rapperPhotos.length > 1 ? 's' : ''} available for {selectedRapper}
                      </p>
                    )}
                  </div>

                  {selectedRapper && rapperPhotos.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={goToPreviousPhoto}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous Photo
                      </Button>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {currentPhotoIndex + 1} / {rapperPhotos.length}
                      </span>
                      <Button
                        onClick={goToNextPhoto}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        Next Photo
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or Manual
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bgImage">Background Image URL</Label>
                    <Input
                      id="bgImage"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={backgroundImage}
                      onChange={(e) => setBackgroundImage(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Paste an image URL from the web
                    </p>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or
                      </span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bgImageFile">Upload from Computer</Label>
                    <Input
                      id="bgImageFile"
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setBackgroundImage(reader.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="cursor-pointer"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload JPG, PNG, or WebP (recommended: 1000×1000px or larger)
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Maximize2 className="w-4 h-4 text-primary" />
                      <Label htmlFor="imageScale">Zoom: {imageScale}%</Label>
                    </div>
                    <Slider
                      id="imageScale"
                      value={[imageScale]}
                      onValueChange={(v) => setImageScale(v[0])}
                      min={50}
                      max={200}
                      step={5}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Move className="w-4 h-4 text-primary" />
                      <Label>Position</Label>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="posX" className="text-xs text-muted-foreground">Horizontal: {imagePositionX}%</Label>
                        <Slider
                          id="posX"
                          value={[imagePositionX]}
                          onValueChange={(v) => setImagePositionX(v[0])}
                          min={0}
                          max={100}
                          step={1}
                        />
                      </div>
                      <div>
                        <Label htmlFor="posY" className="text-xs text-muted-foreground">Vertical: {imagePositionY}%</Label>
                        <Slider
                          id="posY"
                          value={[imagePositionY]}
                          onValueChange={(v) => setImagePositionY(v[0])}
                          min={0}
                          max={100}
                          step={1}
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="imageFit">Image Fit</Label>
                    <Select value={imageFit} onValueChange={(v: 'cover' | 'contain' | 'fill') => setImageFit(v)}>
                      <SelectTrigger id="imageFit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">Cover (Fill)</SelectItem>
                        <SelectItem value="contain">Contain (Fit)</SelectItem>
                        <SelectItem value="fill">Fill (Stretch)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    onClick={() => {
                      setImageScale(100);
                      setImagePositionX(50);
                      setImagePositionY(50);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    Reset Position
                  </Button>
                </TabsContent>

                <TabsContent value="overlay" className="space-y-4">
                  <div>
                    <Label htmlFor="overlayOpacity">Overlay Opacity: {overlayOpacity}%</Label>
                    <Slider
                      id="overlayOpacity"
                      value={[overlayOpacity]}
                      onValueChange={(v) => setOverlayOpacity(v[0])}
                      min={0}
                      max={100}
                      step={5}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Adjust the overlay darkness for better text readability
                    </p>
                  </div>

                  {(template as any).layoutType === 'geniusBox' && (
                    <div>
                      <Label htmlFor="accentColor">Footer Accent Color</Label>
                      <div className="flex gap-2 mt-2">
                        <Input
                          id="accentColor"
                          type="color"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          className="w-20 h-10 cursor-pointer"
                        />
                        <Input
                          type="text"
                          value={accentColor}
                          onChange={(e) => setAccentColor(e.target.value)}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose the accent color for the footer bar
                      </p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="customFontSize">Font Size: {fontSize}px</Label>
                    <Slider
                      id="customFontSize"
                      value={[fontSize]}
                      onValueChange={(v) => setCustomFontSize(v[0])}
                      min={12}
                      max={72}
                      step={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customAlignment">Text Alignment</Label>
                    <Select value={alignment} onValueChange={(v: 'left' | 'center' | 'right') => setCustomAlignment(v)}>
                      <SelectTrigger id="customAlignment">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fontStyle">Font Style</Label>
                    <Select value={fontStyle} onValueChange={(v: 'normal' | 'italic') => setCustomFontStyle(v)}>
                      <SelectTrigger id="fontStyle">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="italic">Italic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fontFamily">Font Family</Label>
                    <Select value={fontFamily} onValueChange={(v: string) => setCustomFontFamily(v)}>
                      <SelectTrigger id="fontFamily">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Inter">Inter</SelectItem>
                        <SelectItem value="Inter Tight">Inter Tight</SelectItem>
                        <SelectItem value="Georgia">Georgia</SelectItem>
                        <SelectItem value="Arial">Arial</SelectItem>
                        <SelectItem value="Helvetica">Helvetica</SelectItem>
                        <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                        <SelectItem value="Courier New">Courier New</SelectItem>
                        <SelectItem value="Verdana">Verdana</SelectItem>
                        <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                        <SelectItem value="Impact">Impact</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="boxPosition">Box Position (Genius Box only)</Label>
                    <Select value={boxPosition} onValueChange={(v: 'top' | 'bottom') => setBoxPosition(v)}>
                      <SelectTrigger id="boxPosition">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top">Top</SelectItem>
                        <SelectItem value="bottom">Bottom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="showFooter">Show Footer Bar</Label>
                    <Switch
                      id="showFooter"
                      checked={showFooter}
                      onCheckedChange={setShowFooter}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="watermark">Show Watermark</Label>
                    <Switch
                      id="watermark"
                      checked={showWatermark}
                      onCheckedChange={setShowWatermark}
                    />
                  </div>

                  {showWatermark && (
                    <div>
                      <Label htmlFor="watermarkText">Watermark Text</Label>
                      <Input
                        id="watermarkText"
                        placeholder="e.g., GENIUS, LYRICS, etc."
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value.toUpperCase())}
                        maxLength={20}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Customize the watermark text (max 20 characters)
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </Card>

            <Card className="p-6">
              <h3 className="font-display font-semibold mb-4 flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" />
                Export & Share
              </h3>
              
                <div className="space-y-3">
                <Button onClick={copyToClipboard} variant="default" className="w-full">
                  Copy to Clipboard
                </Button>
                <Button onClick={uploadCardToS3} variant="outline" className="w-full">
                  Upload card to S3
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => exportCard('png', 2)} variant="outline" size="sm">
                    PNG (2x)
                  </Button>
                  <Button onClick={() => exportCard('png', 3)} variant="outline" size="sm">
                    PNG (3x)
                  </Button>
                  <Button onClick={() => exportCard('jpeg', 2)} variant="outline" size="sm">
                    JPEG (2x)
                  </Button>
                  <Button onClick={() => exportCard('jpeg', 3)} variant="outline" size="sm">
                    JPEG (3x)
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Export at 1080×1080 minimum resolution
                </p>
              </div>
            </Card>
          </div>

          {/* Preview */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <Card className="p-6">
              <h3 className="font-display font-semibold mb-4">Preview</h3>
              
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-square rounded-xl overflow-hidden shadow-elevated max-w-[500px] mx-auto"
              >
                <div
                  ref={canvasRef}
                  className="w-full h-full relative flex flex-col"
                  style={{
                    fontFamily: template.fontFamily,
                    width: '500px',
                    height: '500px',
                  }}
                >
                  {/* Background Image */}
                  {backgroundImage && (
                    <div 
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: imageFit,
                        backgroundPosition: `${imagePositionX}% ${imagePositionY}%`,
                        transform: `scale(${imageScale / 100})`,
                        transformOrigin: 'center',
                      }}
                    />
                  )}
                  
                  {/* Genius Box Layout - Diagonal Split Line */}
                  {(template as any).layoutType === 'geniusBox' && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background: 'linear-gradient(135deg, transparent 48%, rgba(0,0,0,0.8) 48%, rgba(0,0,0,0.8) 52%, transparent 52%)',
                        zIndex: 1,
                      }}
                    />
                  )}
                  
                  {/* Overlay Gradient */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: template.overlayGradient,
                      opacity: overlayOpacity / 100,
                    }}
                  />
                  
                  {/* Content Container - Different for Genius Box */}
                  {(template as any).layoutType === 'geniusBox' ? (
                    <div className={`relative z-10 flex-1 flex flex-col px-6 py-10 gap-1 ${
                      boxPosition === 'top' ? 'justify-start' : 'justify-end'
                    }`}>
                      {/* White text boxes with lyrics - one box per line */}
                      {(quote || 'Your lyrics will appear here...').split('\n').filter(line => line.trim()).map((line, index) => (
                        <div
                          key={index}
                          className="px-4 py-2.5 shadow-2xl inline-block"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(10px)',
                            width: 'fit-content',
                          }}
                        >
                          <p
                            className="font-semibold leading-tight whitespace-nowrap"
                            style={{
                              fontSize: `${fontSize}px`,
                              color: '#000000',
                              textAlign: alignment,
                              fontStyle: fontStyle,
                              fontFamily: fontFamily,
                            }}
                          >
                            {line}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div 
                      className="relative z-10 flex-1 flex flex-col justify-center"
                      style={{
                        padding: `${template.padding}px`,
                      }}
                    >
                      <div 
                        className="space-y-6"
                        style={{
                          textAlign: alignment,
                        }}
                      >
                        <p
                          className="font-bold leading-tight"
                          style={{
                            fontSize: `${fontSize}px`,
                            color: template.textColor,
                            textShadow: template.textShadow,
                            maxWidth: '100%',
                            wordWrap: 'break-word',
                            fontFamily: fontFamily,
                            fontStyle: fontStyle,
                          }}
                        >
                          {quote || 'Your lyrics will appear here...'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Footer Bar - Different for Genius Box */}
                  {showFooter && (template as any).layoutType === 'geniusBox' && (artistName || trackName) ? (
                    <div className="relative z-10">
                      {/* Dark background with song info */}
                      <div
                        className="py-4 px-6"
                        style={{
                          backgroundColor: '#1a1a1a',
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium text-xs mb-0.5">
                              {trackName || 'Track Name'}
                            </p>
                            <p className="text-white/60 text-[10px] uppercase tracking-wider">
                              {artistName || 'Artist Name'}
                            </p>
                          </div>
                          {showWatermark && (
                            <div className="text-white/90 text-[10px] font-bold uppercase tracking-widest">
                              {watermarkText}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Colored accent bar at bottom */}
                      <div
                        style={{
                          height: '6px',
                          backgroundColor: currentAccentColor,
                        }}
                      />
                    </div>
                  ) : showFooter && attribution ? (
                    <div 
                      className="relative z-10 py-4 px-8"
                      style={{
                        background: template.footerBg,
                        backdropFilter: 'blur(10px)',
                      }}
                    >
                      <p
                        className="font-semibold uppercase tracking-wider"
                        style={{
                          fontSize: `${template.footerFontSize}px`,
                          color: template.textColor,
                          letterSpacing: '0.1em',
                        }}
                      >
                        {attribution}
                      </p>
                    </div>
                  ) : null}

                  {/* Watermark for non-Genius Box layouts */}
                  {showWatermark && (template as any).layoutType !== 'geniusBox' && (
                    <div 
                      className="absolute bottom-4 right-4 text-xs font-semibold uppercase tracking-widest z-20"
                      style={{
                        color: template.textColor,
                        opacity: 0.5,
                        letterSpacing: '0.15em',
                      }}
                    >
                      {watermarkText}
                    </div>
                  )}
                </div>
              </motion.div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
