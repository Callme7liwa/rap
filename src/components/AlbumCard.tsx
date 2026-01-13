import { Link, useNavigate } from 'react-router-dom';
import { Album } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Calendar, Disc } from 'lucide-react';
import { motion } from 'framer-motion';
import { VoteButton } from '@/components/VoteButton';
import { LikeButton } from '@/components/LikeButton';
import { OwnershipBadge } from '@/components/OwnershipBadge';
import { EditButton } from '@/components/EditButton';
import { useOwnsContent } from '@/hooks/useArtistOwnership';

interface AlbumCardProps {
  album: Album;
  index?: number;
}

export function AlbumCard({ album, index = 0 }: AlbumCardProps) {
  const isOwned = useOwnsContent(album.artist_id);
  const navigate = useNavigate();

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/albums/${album.id}/edit`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group block overflow-hidden rounded-xl bg-card border border-border hover-lift relative"
    >
      <Link
        to={`/albums/${album.id}`}
        className="block"
      >
        <div className="aspect-square relative overflow-hidden bg-muted">
          <img
            src={album.cover_art_url}
            alt={album.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
          />
          {isOwned && (
            <div className="absolute top-3 right-3">
              <OwnershipBadge size="sm" showText={false} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-display font-semibold text-lg truncate group-hover:text-primary transition-colors flex-1">
              {album.name}
            </h3>
            {isOwned && (
              <OwnershipBadge size="sm" showText={false} className="flex-shrink-0" />
            )}
          </div>

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

      {/* Actions - Top Right (Outside Link) */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        {isOwned && (
          <EditButton
            onClick={handleEdit}
            variant="ghost"
            size="sm"
            showText={false}
            className="bg-background/80 hover:bg-background hover:bg-primary/20"
          />
        )}
        <LikeButton
          contentType="album"
          contentId={album.id}
          showCount={false}
          variant="ghost"
          size="sm"
          className="bg-background/80 hover:bg-background"
        />
        <VoteButton
          type="album"
          itemId={album.id}
          variant="icon"
          showCount={true}
          className="bg-background/80 hover:bg-background"
        />
      </div>
    </motion.div>
  );
}
