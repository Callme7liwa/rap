import { Link } from 'react-router-dom';
import { Album } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Calendar, Disc } from 'lucide-react';
import { motion } from 'framer-motion';

interface AlbumCardProps {
  album: Album;
  index?: number;
}

export function AlbumCard({ album, index = 0 }: AlbumCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/albums/${album.id}`}
        className="group block overflow-hidden rounded-xl bg-card border border-border hover-lift"
      >
        <div className="aspect-square relative overflow-hidden bg-muted">
          <img
            src={album.cover_art_url}
            alt={album.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
        
        <div className="p-4">
          <h3 className="font-display font-semibold text-lg mb-1 truncate group-hover:text-primary transition-colors">
            {album.name}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-3 truncate">
            {album.artist_name}
          </p>

          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span>{album.release_date_components.year}</span>
            </div>
            <Badge variant="secondary" className="gap-1">
              <Disc className="w-3 h-3" />
              {album.songs.length} tracks
            </Badge>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
