import { Link } from 'react-router-dom';
import { Song } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Play, Eye, MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';

interface SongRowProps {
  song: Song;
  index?: number;
  showArtwork?: boolean;
}

export function SongRow({ song, index = 0, showArtwork = true }: SongRowProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
    >
      <Link
        to={`/songs/${song.id}`}
        className="group flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
      >
        {showArtwork && (
          <div className="relative flex-shrink-0">
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-muted">
              <img
                src={song.song_art_image_url}
                alt={song.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="absolute inset-0 bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
              <Play className="w-5 h-5 text-primary" />
            </div>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate group-hover:text-primary transition-colors">
            {song.title}
          </h4>
          <p className="text-sm text-muted-foreground truncate">
            {song.primary_artist_name}
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-3 h-3" />
            <span>{(song.pageviews / 1000).toFixed(1)}K</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            <span>{song.annotation_count}</span>
          </div>
        </div>

        {!song.instrumental && song.lyrics_state === 'complete' && (
          <Badge variant="secondary" className="hidden md:flex">
            Lyrics
          </Badge>
        )}
        
        {song.instrumental && (
          <Badge variant="outline" className="hidden md:flex">
            Instrumental
          </Badge>
        )}
      </Link>
    </motion.div>
  );
}
