import { Link } from 'react-router-dom';
import { Artist } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface ArtistCardProps {
  artist: Artist;
  index?: number;
}

export function ArtistCard({ artist, index = 0 }: ArtistCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
    >
      <Link
        to={`/artists/${artist.id}`}
        className="group block overflow-hidden rounded-xl bg-card border border-border hover-lift"
      >
        <div className="aspect-square relative overflow-hidden bg-muted">
          <img
            src={artist.image_url}
            alt={artist.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {artist.is_verified && (
            <div className="absolute top-3 right-3">
              <CheckCircle2 className="w-6 h-6 text-primary glow-primary" />
            </div>
          )}
        </div>
        
        <div className="p-4">
          <h3 className="font-display font-semibold text-lg mb-2 truncate group-hover:text-primary transition-colors">
            {artist.name}
          </h3>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Users className="w-4 h-4" />
            <span>{artist.followers_count.toLocaleString()} followers</span>
          </div>

          {artist.alternate_names.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {artist.alternate_names.slice(0, 2).map((name, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
              {artist.alternate_names.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{artist.alternate_names.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
