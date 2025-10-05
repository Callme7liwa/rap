import { useState, useRef } from 'react';
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
import { Download, Wand2, Image as ImageIcon, Type, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const themes = {
  dark: {
    name: 'Dark',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #0f0f1e 100%)',
    textColor: '#ffffff',
    accentColor: '#6366f1',
  },
  light: {
    name: 'Light',
    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    textColor: '#1a1a1a',
    accentColor: '#4f46e5',
  },
  neon: {
    name: 'Neon',
    background: 'linear-gradient(135deg, #ff006e 0%, #8338ec 100%)',
    textColor: '#ffffff',
    accentColor: '#06ffa5',
  },
  film: {
    name: 'Film Grain',
    background: 'linear-gradient(135deg, #2c2c2c 0%, #1a1a1a 100%)',
    textColor: '#f5f5f5',
    accentColor: '#ffd700',
  },
  duotone: {
    name: 'Duotone',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    textColor: '#ffffff',
    accentColor: '#f093fb',
  },
  blur: {
    name: 'Blur',
    background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.8) 0%, rgba(139, 92, 246, 0.8) 100%)',
    textColor: '#ffffff',
    accentColor: '#fbbf24',
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
  const [selectedTheme, setSelectedTheme] = useState<keyof typeof themes>('dark');
  const [backgroundImage, setBackgroundImage] = useState('');
  const [fontSize, setFontSize] = useState(32);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [alignment, setAlignment] = useState<'left' | 'center' | 'right'>('center');
  const [showWatermark, setShowWatermark] = useState(true);

  const exportCard = async (format: 'png' | 'jpeg', scale: number = 2) => {
    if (!canvasRef.current) return;

    try {
      const exportFn = format === 'png' ? toPng : toJpeg;
      const dataUrl = await exportFn(canvasRef.current, {
        quality: 1,
        pixelRatio: scale,
        cacheBust: true,
      });

      const link = document.createElement('a');
      link.download = `lyrics-card-${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();

      toast.success(`Card exported as ${format.toUpperCase()} at ${scale}x resolution!`);
    } catch (error) {
      toast.error('Failed to export card. Please try again.');
      console.error(error);
    }
  };

  const theme = themes[selectedTheme];

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
              <Tabs defaultValue="theme">
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="theme">
                    <Palette className="w-4 h-4 mr-2" />
                    Theme
                  </TabsTrigger>
                  <TabsTrigger value="background">
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Background
                  </TabsTrigger>
                  <TabsTrigger value="typography">
                    <Type className="w-4 h-4 mr-2" />
                    Typography
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="theme" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(themes).map(([key, t]) => (
                      <button
                        key={key}
                        onClick={() => setSelectedTheme(key as keyof typeof themes)}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          selectedTheme === key
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div
                          className="w-full h-16 rounded mb-2"
                          style={{ background: t.background }}
                        />
                        <p className="text-sm font-medium">{t.name}</p>
                      </button>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="background" className="space-y-4">
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
                      Leave empty to use theme gradient
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="typography" className="space-y-4">
                  <div>
                    <Label htmlFor="font">Font Family</Label>
                    <Select value={fontFamily} onValueChange={setFontFamily}>
                      <SelectTrigger id="font">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {fonts.map((font) => (
                          <SelectItem key={font.value} value={font.value}>
                            {font.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fontSize">Font Size: {fontSize}px</Label>
                    <Slider
                      id="fontSize"
                      value={[fontSize]}
                      onValueChange={(v) => setFontSize(v[0])}
                      min={20}
                      max={72}
                      step={2}
                    />
                  </div>

                  <div>
                    <Label htmlFor="alignment">Text Alignment</Label>
                    <Select value={alignment} onValueChange={(v: any) => setAlignment(v)}>
                      <SelectTrigger id="alignment">
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
                Export
              </h3>
              
              <div className="grid grid-cols-2 gap-3">
                <Button onClick={() => exportCard('png', 1)} variant="outline">
                  PNG (1x)
                </Button>
                <Button onClick={() => exportCard('png', 2)} variant="outline">
                  PNG (2x)
                </Button>
                <Button onClick={() => exportCard('jpeg', 1)} variant="outline">
                  JPEG (1x)
                </Button>
                <Button onClick={() => exportCard('jpeg', 2)} variant="outline">
                  JPEG (2x)
                </Button>
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
                  className="w-full h-full p-12 flex flex-col justify-center items-center relative"
                  style={{
                    background: backgroundImage
                      ? `url(${backgroundImage})`
                      : theme.background,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    color: theme.textColor,
                    fontFamily: fontFamily,
                    textAlign: alignment,
                  }}
                >
                  {backgroundImage && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
                  )}
                  
                  <div className="relative z-10 space-y-6 w-full">
                    <p
                      className="font-semibold leading-tight"
                      style={{
                        fontSize: `${fontSize}px`,
                        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    >
                      {quote || 'Your lyrics will appear here...'}
                    </p>
                    
                    {attribution && (
                      <p
                        className="font-medium opacity-80"
                        style={{
                          fontSize: `${fontSize * 0.5}px`,
                          color: theme.accentColor,
                        }}
                      >
                        — {attribution}
                      </p>
                    )}
                  </div>

                  {showWatermark && (
                    <div className="absolute bottom-6 right-6 text-xs opacity-60">
                      LyricsHub
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
