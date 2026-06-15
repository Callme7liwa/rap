import { Link, useNavigate } from 'react-router-dom';
import { Artist } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { VoteButton } from '@/components/VoteButton';
import { FollowButton } from '@/components/FollowButton';
import { OwnershipBadge } from '@/components/OwnershipBadge';
import { EditButton } from '@/components/EditButton';
import { useOwnsArtist } from '@/hooks/useArtistOwnership';

interface ArtistCardProps {
  artist: Artist;
  index?: number;
}

export function ArtistCard({ artist, index = 0 }: ArtistCardProps) {
  const isOwned = useOwnsArtist(artist.id);
  const navigate = useNavigate();
  const alternateNames = artist.alternate_names ?? [];
  const followersCount = artist.followers_count ?? 0;
  const imageUrl = artist.image_url || '/placeholder.svg';

  const handleEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/artists/${artist.id}/edit`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group block overflow-hidden rounded-none bg-card border border-border hover:shadow-hard transition-shadow relative"
    >
      <Link
        to={`/artists/${artist.id}`}
        className="block"
      >
        <div className="aspect-square relative overflow-hidden bg-muted">
          <img
            src={imageUrl}
            alt={artist.name}
            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.src = '/placeholder.svg';
            }}
          />
          {artist.is_verified && (
            <div className="absolute top-3 left-3">
              <CheckCircle2 className="w-6 h-6 text-primary glow-primary" />
            </div>
          )}
          {isOwned && (
            <div className="absolute top-3 right-3">
              <OwnershipBadge size="sm" showText={false} />
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="font-heading font-semibold uppercase tracking-wide text-lg truncate group-hover:text-primary transition-colors">
              {artist.name}
            </h3>
            {isOwned && (
              <OwnershipBadge size="sm" showText={false} />
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Users className="w-4 h-4" />
            <span>{followersCount.toLocaleString()} followers</span>
          </div>

          {alternateNames.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {alternateNames.slice(0, 2).map((name, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {name}
                </Badge>
              ))}
              {alternateNames.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{alternateNames.length - 2}
                </Badge>
              )}
            </div>
          )}
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
        <FollowButton
          artistId={artist.id}
          artistName={artist.name}
          showText={false}
          variant="ghost"
          size="sm"
          className="bg-background/80 hover:bg-background"
        />
        <VoteButton
          type="artist"
          itemId={artist.id}
          variant="icon"
          showCount={true}
          className="bg-background/80 hover:bg-background"
        />
      </div>
    </motion.div>
  );
}
