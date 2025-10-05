import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSongById } from '@/lib/api';
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
import { Download, Wand2, Image as ImageIcon, Type, Palette, Maximize2, Move, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const templates = {
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
  const canvasRef = useRef<HTMLDivElement>(null);

  const { data: song } = useQuery({
    queryKey: ['song', songId],
    queryFn: () => getSongById(parseInt(songId!)),
    enabled: !!songId,
  });

  const [quote, setQuote] = useState('');
  const [attribution, setAttribution] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof templates>('geniusClassic');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [imageScale, setImageScale] = useState(100);
  const [imagePositionX, setImagePositionX] = useState(50);
  const [imagePositionY, setImagePositionY] = useState(50);
  const [imageFit, setImageFit] = useState<'cover' | 'contain' | 'fill'>('cover');
  const [overlayOpacity, setOverlayOpacity] = useState(100);
  const [customFontSize, setCustomFontSize] = useState<number | null>(null);
  const [customAlignment, setCustomAlignment] = useState<'left' | 'center' | 'right' | null>(null);
  const [showWatermark, setShowWatermark] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  const template = templates[selectedTemplate];
  const fontSize = customFontSize ?? template.fontSize;
  const alignment = customAlignment ?? template.textAlign;

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
                  <Label htmlFor="quote">Lyric Quote</Label>
                  <Textarea
                    id="quote"
                    placeholder="Enter your favorite lyrics..."
                    value={quote}
                    onChange={(e) => setQuote(e.target.value)}
                    className="min-h-32"
                  />
                </div>

                <div>
                  <Label htmlFor="attribution">Attribution (Artist - Song)</Label>
                  <Input
                    id="attribution"
                    placeholder="e.g., 7ARI - 101"
                    value={attribution}
                    onChange={(e) => setAttribution(e.target.value)}
                  />
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
                    <Label htmlFor="bgImage">Background Image URL</Label>
                    <Input
                      id="bgImage"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={backgroundImage}
                      onChange={(e) => setBackgroundImage(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use artist or album artwork for best results
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
                    <Select value={imageFit} onValueChange={(v: any) => setImageFit(v)}>
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
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <div>
                    <Label htmlFor="customFontSize">Font Size: {fontSize}px</Label>
                    <Slider
                      id="customFontSize"
                      value={[fontSize]}
                      onValueChange={(v) => setCustomFontSize(v[0])}
                      min={24}
                      max={72}
                      step={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="customAlignment">Text Alignment</Label>
                    <Select value={alignment} onValueChange={(v: any) => setCustomAlignment(v)}>
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
                className="aspect-square rounded-xl overflow-hidden shadow-elevated"
              >
                <div
                  ref={canvasRef}
                  className="w-full h-full relative flex flex-col"
                  style={{
                    fontFamily: template.fontFamily,
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
                  
                  {/* Overlay Gradient */}
                  <div 
                    className="absolute inset-0"
                    style={{
                      background: template.overlayGradient,
                      opacity: overlayOpacity / 100,
                    }}
                  />
                  
                  {/* Content Container */}
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
                        }}
                      >
                        {quote || 'Your lyrics will appear here...'}
                      </p>
                    </div>
                  </div>

                  {/* Footer Bar */}
                  {showFooter && attribution && (
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
                  )}

                  {/* Watermark */}
                  {showWatermark && (
                    <div 
                      className="absolute bottom-4 right-4 text-xs font-semibold uppercase tracking-widest z-20"
                      style={{
                        color: template.textColor,
                        opacity: 0.5,
                        letterSpacing: '0.15em',
                      }}
                    >
                      GENIUS
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
