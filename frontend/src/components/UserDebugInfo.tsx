import { Button } from '@/components/ui/button';
import { useArtistOwnership } from '@/hooks/useArtistOwnership';
import { useAuth } from '@/store/auth.store';

/**
 * Debug component to show current user and artist ownership info
 * Add to any page with: <UserDebugInfo />
 */
export function UserDebugInfo() {
  const { user, token } = useAuth();
  const { data: ownership } = useArtistOwnership();

  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-sm p-4 shadow-hard max-w-md z-50">
      <h3 className="font-semibold mb-2 text-sm">🐛 Debug Info</h3>
      <div className="text-xs space-y-1 text-muted-foreground">
        <div><strong>User ID:</strong> {user.id}</div>
        <div><strong>Display name:</strong> {user.display_name || 'None'}</div>
        <div><strong>Email:</strong> {user.email}</div>
        <div><strong>Role:</strong> {user.role}</div>
        
        {ownership ? (
          <div className="mt-2 pt-2 border-t">
            <div><strong>🎤 Artist:</strong> {ownership.artist.name}</div>
            <div><strong>Artist ID:</strong> {ownership.artist.id}</div>
          </div>
        ) : (
          <div className="mt-2 pt-2 border-t text-yellow-500">
            ⚠️ Not associated with any artist
          </div>
        )}
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="mt-2 w-full"
        onClick={() => {
          const info = {
            user,
            ownership,
            localStorage: {
              token: token ? `${token.slice(0, 50)}...` : null,
            }
          };
          console.log('Full debug info:', info);
          navigator.clipboard.writeText(JSON.stringify(info, null, 2));
          alert('Debug info copied to clipboard and logged to console');
        }}
      >
        Copy Debug Info
      </Button>
    </div>
  );
}
