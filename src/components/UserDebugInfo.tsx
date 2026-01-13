import { useEffect, useState } from 'react';
import { fetchAuthSession, fetchUserAttributes } from 'aws-amplify/auth';
import { Button } from '@/components/ui/button';
import { useArtistOwnership } from '@/hooks/useArtistOwnership';

/**
 * Debug component to show current user and artist ownership info
 * Add to any page with: <UserDebugInfo />
 */
export function UserDebugInfo() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const { data: ownership } = useArtistOwnership();

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const session = await fetchAuthSession();
        const attributes = await fetchUserAttributes();
        
        setUserInfo({
          userId: session.tokens?.idToken?.payload.sub,
          username: session.tokens?.idToken?.payload['cognito:username'],
          email: attributes.email,
          groups: session.tokens?.idToken?.payload['cognito:groups'] || [],
          tokenExp: session.tokens?.idToken?.payload.exp,
        });
      } catch (error) {
        console.error('Failed to load user info:', error);
      }
    };
    loadUserInfo();
  }, []);

  if (!userInfo) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-semibold mb-2 text-sm">🐛 Debug Info</h3>
      <div className="text-xs space-y-1 text-muted-foreground">
        <div><strong>User ID:</strong> {userInfo.userId?.slice(0, 20)}...</div>
        <div><strong>Username:</strong> {userInfo.username}</div>
        <div><strong>Email:</strong> {userInfo.email}</div>
        <div><strong>Groups:</strong> {userInfo.groups.join(', ') || 'None'}</div>
        <div><strong>Token expires:</strong> {new Date(userInfo.tokenExp * 1000).toLocaleTimeString()}</div>
        
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
            user: userInfo,
            ownership,
            localStorage: {
              token: localStorage.getItem('token')?.slice(0, 50) + '...'
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
