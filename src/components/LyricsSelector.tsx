import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Download, Upload, Wand2, Image as ImageIcon, Plus, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { fetchAuthSession } from 'aws-amplify/auth';
import { getArtistById, getArtistSongs } from '@/lib/api';

export interface LyricsSelection {
  id: string;
  text: string;
  imageUrl: string;
  artistName: string;
  songName: string;
  artistId: number;
  availablePhotos?: string[];
  currentPhotoIndex?: number;
}

interface LyricsSelectorProps {
  selections: LyricsSelection[];
  onRemove: (id: string) => void;
  onImageChange: (id: string, imageUrl: string) => void;
  onCreateCards: () => void;
  onClear: () => void;
  artistId: number;
}

export function LyricsSelector({
  selections,
  onRemove,
  onImageChange,
  onCreateCards,
  onClear,
  artistId,
}: LyricsSelectorProps) {
  const [generatedCards, setGeneratedCards] = useState<Map<string, string>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [artistPhotos, setArtistPhotos] = useState<string[]>([]);

  // Charger les photos de l'artiste
  useEffect(() => {
    if (!artistId) return;

    const loadArtistPhotos = async () => {
      const photos: string[] = [];
      
      try {
        const artist = await getArtistById(artistId);
        
        if (artist) {
          if (artist.image_url) photos.push(artist.image_url);
          if (artist.header_image_url) photos.push(artist.header_image_url);
        }

        // Charger les songs pour avoir les artwork
        const songs = await getArtistSongs(artistId);
        songs.forEach((song) => {
          if (song.song_art_image_url && !photos.includes(song.song_art_image_url)) {
            photos.push(song.song_art_image_url);
          }
        });

        setArtistPhotos(photos);
      } catch (error) {
        console.error('Error loading artist photos:', error);
      }
    };

    loadArtistPhotos();
  }, [artistId]);

  const generateCard = async (selection: LyricsSelection) => {
    setIsGenerating(true);
    try {
      if (!selection.imageUrl) {
        toast.error('No image selected');
        return null;
      }

      // Créer un canvas pour le template Genius Box
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1080;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      // Charger l'image de fond via proxy pour éviter les problèmes CORS
      const bgImage = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Use backend proxy to load external images
        const proxyUrl = `${import.meta.env.VITE_API_ENDPOINT}/proxy/image?url=${encodeURIComponent(selection.imageUrl)}`;
        
        img.onload = () => resolve(img);
        img.onerror = (error) => {
          console.error('Failed to load image via proxy:', error);
          reject(new Error(`Failed to load image: ${selection.imageUrl}`));
        };
        img.src = proxyUrl;
      });

      // Dessiner l'image de fond (couvrir tout le canvas)
      ctx.drawImage(bgImage, 0, 0, 1080, 1080);

      // ===== CONFIGURATION =====
      const boxPadding = 60;
      const boxSpacing = 8;
      const fontSize = 32;
      const boxInnerPadding = 16;
      const footerHeight = 100;
      const accentHeight = 12;

      // ===== LYRICS BOXES (une box par ligne, positionnées en bas) =====
      const lines = selection.text.split('\n').filter(line => line.trim());
      if (lines.length === 0) {
        lines.push('Your lyrics will appear here...');
      }
      
      // Calculer la hauteur totale des boxes pour les positionner en bas
      ctx.font = `600 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
      const totalBoxesHeight = lines.reduce((total) => {
        const boxHeight = fontSize + (boxInnerPadding * 2);
        return total + boxHeight + boxSpacing;
      }, 0) - boxSpacing;
      
      // Positionner les boxes juste au-dessus du footer
      let currentY = 1080 - footerHeight - totalBoxesHeight - 40;

      ctx.font = `600 ${fontSize}px Inter, -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.textBaseline = 'top';

      // Dessiner chaque ligne dans sa propre box blanche (comme le template)
      lines.forEach((line) => {
        const textMetrics = ctx.measureText(line);
        const textWidth = textMetrics.width;
        const boxWidth = textWidth + (boxInnerPadding * 2);
        const boxHeight = fontSize + (boxInnerPadding * 2);
        const boxX = boxPadding;

        // Ombre pour la box
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 10;
        
        // Dessiner la box blanche semi-transparente
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.fillRect(boxX, currentY, boxWidth, boxHeight);
        
        // Reset shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Texte noir dans la box
        ctx.fillStyle = '#000000';
        ctx.fillText(line, boxX + boxInnerPadding, currentY + boxInnerPadding);

        currentY += boxHeight + boxSpacing;
      });

      // ===== FOOTER (structure exacte du template) =====
      const footerY = 1080 - footerHeight;

      // Fond noir du footer
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, footerY, 1080, footerHeight - accentHeight);

      // Track name (petit, en haut)
      ctx.font = '600 24px Inter, sans-serif';
      ctx.fillStyle = 'white';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(selection.songName, 60, footerY + 20);

      // Artist name (en majuscules, plus petit, grisé)
      ctx.font = '400 20px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillText(selection.artistName.toUpperCase(), 60, footerY + 50);

      // Watermark GENIUS à droite
      ctx.font = 'bold 20px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.textAlign = 'right';
      ctx.fillText('DURAPP', 1020, footerY + 35);

      // Barre d'accent colorée en bas (6px dans le template, 12px ici pour la visibilité)
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(0, 1080 - accentHeight, 1080, accentHeight);

      // Convertir en data URL
      const dataUrl = canvas.toDataURL('image/png', 1.0);

      setGeneratedCards(prev => new Map(prev).set(selection.id, dataUrl));
      toast.success('Card generated!');
      return dataUrl;
    } catch (error) {
      console.error('Failed to generate card:', error);
      toast.error('Failed to generate card. Check console for details.');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadCard = (selection: LyricsSelection, dataUrl: string) => {
    const link = document.createElement('a');
    const filename = `${selection.artistName.toLowerCase().replace(/\s+/g, '-')}-${selection.songName.toLowerCase().replace(/\s+/g, '-')}-${selection.id}.png`;
    link.download = filename;
    link.href = dataUrl;
    link.click();
    toast.success('Card downloaded!');
  };

  const goToNextPhoto = (selectionId: string, currentIndex: number) => {
    if (artistPhotos.length === 0) return;
    const nextIndex = (currentIndex + 1) % artistPhotos.length;
    onImageChange(selectionId, artistPhotos[nextIndex]);
  };

  const goToPreviousPhoto = (selectionId: string, currentIndex: number) => {
    if (artistPhotos.length === 0) return;
    const prevIndex = currentIndex === 0 ? artistPhotos.length - 1 : currentIndex - 1;
    onImageChange(selectionId, artistPhotos[prevIndex]);
  };

  const downloadAllCards = async () => {
    if (selections.length === 0) return;
    
    setIsGenerating(true);
    toast.info(`Generating ${selections.length} cards...`);
    
    let successCount = 0;
    
    for (const selection of selections) {
      if (!selection.imageUrl) {
        toast.error(`No image for "${selection.text.substring(0, 30)}..."`);
        continue;
      }
      
      try {
        // Générer la carte si pas déjà générée
        let dataUrl = generatedCards.get(selection.id);
        if (!dataUrl) {
          dataUrl = await generateCard(selection);
          if (!dataUrl) continue;
        }
        
        // Télécharger avec un délai entre chaque
        await new Promise(resolve => setTimeout(resolve, 300));
        downloadCard(selection, dataUrl);
        successCount++;
      } catch (error) {
        console.error('Failed to generate card:', error);
      }
    }
    
    setIsGenerating(false);
    toast.success(`Downloaded ${successCount} / ${selections.length} cards!`);
  };

  const uploadCard = async (selection: LyricsSelection, dataUrl?: string) => {
    try {
      let url = dataUrl;
      if (!url) {
        url = generatedCards.get(selection.id) || (await generateCard(selection));
        if (!url) return;
      }

      const blob = await (await fetch(url)).blob();
      const form = new FormData();
      const filename = `${selection.artistName.toLowerCase().replace(/\s+/g, '-')}-${selection.songName.toLowerCase().replace(/\s+/g, '-')}-${selection.id}.png`;
      form.append('images', blob, filename);

      const base = (import.meta as any).env.VITE_API_URL || 'http://localhost:3000';
      const res = await fetch(`${base}/api/s3/upload`, {
        method: 'POST',
        body: form,
      });

      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || 'Upload failed');
        console.error('Upload error', json);
        return;
      }

      toast.success(`Uploaded ${json.uploaded || 1} image(s) to S3`);
    } catch (err) {
      console.error('Upload card failed', err);
      toast.error('Failed to upload card to S3');
    }
  };

  const uploadAllCards = async () => {
    if (selections.length === 0) return;
    setIsGenerating(true);
    toast.info(`Preparing ${selections.length} images for upload...`);

    try {
      // Get authentication token
      const session = await fetchAuthSession();
      const token = session.tokens?.accessToken?.toString();

      if (!token) {
        toast.error('Please sign in to upload cards');
        return;
      }

      let uploaded = 0;

      // Upload each card individually to /api/uploads
      for (const selection of selections) {
        let dataUrl = generatedCards.get(selection.id);
        if (!dataUrl) {
          dataUrl = await generateCard(selection);
          if (!dataUrl) continue;
        }

        const blob = await (await fetch(dataUrl)).blob();
        const filename = `${selection.artistName.toLowerCase().replace(/\s+/g, '-')}-${selection.songName.toLowerCase().replace(/\s+/g, '-')}-${selection.id}.png`;
        
        const form = new FormData();
        form.append('file', blob, filename);
        form.append('category', 'lyrics-cards');
        form.append('visibility', 'private');

        const res = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/uploads`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: form,
        });

        if (res.ok) {
          uploaded++;
        } else {
          const json = await res.json();
          console.error('Upload error for', filename, json);
        }

        // Small delay to be gentle
        await new Promise(r => setTimeout(r, 200));
      }

      if (uploaded === 0) {
        toast.error('Failed to upload cards');
        return;
      }

      toast.success(`Uploaded ${uploaded} card(s) successfully! Check "My Uploads" to view them.`);
    } catch (err) {
      console.error('Upload all failed', err);
      toast.error('Failed to upload cards. Please sign in first.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (selections.length === 0) return null;

  // Bouton minimisé - toujours en bas
  if (isMinimized) {
    return (
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center">
            <Button
              onClick={() => setIsMinimized(false)}
              className="bg-primary shadow-elevated gap-2 px-6 py-3"
              size="lg"
            >
              <ChevronUp className="w-5 h-5" />
              <span className="font-semibold">{selections.length} Lyrics Selected - Click to expand</span>
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border shadow-elevated"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                {selections.length}
              </div>
              <span className="font-semibold">Lyrics Selected</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMinimized(true)}
              className="gap-2"
            >
              <ChevronDown className="w-4 h-4" />
              Minimize
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onClear}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Clear All
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={onCreateCards}
              className="gap-2 bg-gradient-primary"
            >
              <Wand2 className="w-4 h-4" />
              Open Card Maker
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={downloadAllCards}
              disabled={isGenerating}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              {isGenerating ? 'Generating...' : 'Download All'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={uploadAllCards}
              disabled={isGenerating}
              className="gap-2 bg-gradient-primary"
            >
              <Upload className="w-4 h-4" />
              {isGenerating ? 'Processing...' : 'Upload All'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 max-h-80 overflow-y-auto">
          <AnimatePresence>
            {selections.map((selection) => {
              const hasCard = generatedCards.has(selection.id);
              return (
                <motion.div
                  key={selection.id}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                >
                  <Card className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm line-clamp-2 flex-1">
                        {selection.text}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 flex-shrink-0"
                        onClick={() => onRemove(selection.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Background Image ({artistPhotos.length} available)</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => {
                            const currentIndex = artistPhotos.indexOf(selection.imageUrl);
                            goToPreviousPhoto(selection.id, currentIndex >= 0 ? currentIndex : 0);
                          }}
                          disabled={artistPhotos.length === 0}
                          title="Previous image"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Input
                          type="url"
                          placeholder="Image URL..."
                          value={selection.imageUrl}
                          onChange={(e) => onImageChange(selection.id, e.target.value)}
                          className="text-xs h-8"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 flex-shrink-0"
                          onClick={() => {
                            const currentIndex = artistPhotos.indexOf(selection.imageUrl);
                            goToNextPhoto(selection.id, currentIndex >= 0 ? currentIndex : 0);
                          }}
                          disabled={artistPhotos.length === 0}
                          title="Next image"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                      {artistPhotos.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {artistPhotos.indexOf(selection.imageUrl) + 1} / {artistPhotos.length}
                        </p>
                      )}
                    </div>

                    {selection.imageUrl && (
                      <div className="aspect-video rounded overflow-hidden border border-border">
                        <img
                          src={selection.imageUrl}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!hasCard ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 gap-2"
                          onClick={() => generateCard(selection)}
                          disabled={!selection.imageUrl || isGenerating}
                        >
                          <Plus className="w-4 h-4" />
                          Generate
                        </Button>
                      ) : (
                        <div className="flex gap-2 w-full">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => {
                              const dataUrl = generatedCards.get(selection.id);
                              if (dataUrl) downloadCard(selection, dataUrl);
                            }}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => {
                              const dataUrl = generatedCards.get(selection.id);
                              uploadCard(selection, dataUrl);
                            }}
                          >
                            Upload
                          </Button>
                        </div>
                      )}
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
