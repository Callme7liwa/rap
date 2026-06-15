import { Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OwnershipBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'outline';
  showText?: boolean;
}

export function OwnershipBadge({ 
  className, 
  size = 'md', 
  variant = 'default',
  showText = true 
}: OwnershipBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <Badge
      variant={variant}
      className={cn(
        'gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 font-semibold',
        'shadow-hard transition-shadow',
        sizeClasses[size],
        className
      )}
    >
      <Crown className={cn(iconSizes[size], 'fill-white')} />
      {showText && 'You Own This'}
    </Badge>
  );
}
