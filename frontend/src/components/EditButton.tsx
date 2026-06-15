import { Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EditButtonProps {
  onClick: (e: React.MouseEvent) => void;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showText?: boolean;
}

export function EditButton({ 
  onClick, 
  variant = 'outline', 
  size = 'sm',
  className,
  showText = true 
}: EditButtonProps) {
  return (
    <Button
      variant={variant}
      size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'default'}
      onClick={onClick}
      className={cn(
        'gap-2 hover:bg-primary/10 hover:border-primary transition-all',
        !showText && 'aspect-square p-0',
        className
      )}
      title="Edit"
    >
      <Edit className={cn(
        size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
      )} />
      {showText && <span>Edit</span>}
    </Button>
  );
}
