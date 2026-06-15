import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateCollabRequest, useCollabRequestLimit } from '@/hooks/useCollabRequests';
import { Loader2, Music, Disc, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { useArtistOwnership } from '@/hooks/useArtistOwnership';
import { ApiRequestError, getArtists } from '@/lib/api-client';
import { useAuth } from '@/store/auth.store';

interface RequestCollabFormProps {
  artistId: number;
  artistName: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function RequestCollabForm({ artistId, artistName, onSuccess, onCancel }: RequestCollabFormProps) {
  const [collaborationType, setCollaborationType] = useState<'song' | 'album'>('song');
  const [message, setMessage] = useState('');
  const [collaboratorArtistId, setCollaboratorArtistId] = useState<number | null>(null);
  const [artists, setArtists] = useState<Array<{ id: number; name: string }>>([]);
  const [loadingArtists, setLoadingArtists] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const { data: limitData, isLoading: limitLoading } = useCollabRequestLimit();
  const { data: artistOwnership } = useArtistOwnership();
  const createMutation = useCreateCollabRequest();

  const canRequest = limitData?.canRequest ?? false;
  const remaining = limitData?.remaining ?? 0;
  const isArtist = !!artistOwnership?.artist;

  // Fetch all artists when component mounts (for regular users to select collaborator)
  useEffect(() => {
    if (!isArtist && !isAdmin) {
      fetchArtists();
    }
  }, [isArtist, isAdmin]);

  const fetchArtists = async () => {
    setLoadingArtists(true);
    try {
      const result = await getArtists({ limit: 1000 });
      const allArtists = result.data;
      // Filter out the current artist
      const filteredArtists = allArtists.filter((a: { id: number; name: string }) => a.id !== artistId);
      setArtists(filteredArtists);
    } catch (error) {
      console.error('Error fetching artists:', error);
      toast({
        title: 'Failed to load artists',
        description: 'Could not load the list of artists',
        variant: 'destructive'
      });
    } finally {
      setLoadingArtists(false);
    }
  };

  if (isAdmin) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // For regular users, require a second artist to be selected
    if (!isArtist && !collaboratorArtistId) {
      toast({
        title: 'Select a collaborator',
        description: 'Please select which artist should collaborate with ' + artistName,
        variant: 'destructive'
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Message required',
        description: 'Please describe why you want to collaborate',
        variant: 'destructive'
      });
      return;
    }

    if (message.length > 500) {
      toast({
        title: 'Message too long',
        description: 'Please keep your message under 500 characters',
        variant: 'destructive'
      });
      return;
    }

    try {
      await createMutation.mutateAsync({
        artist_id: artistId,
        collaborator_artist_id: collaboratorArtistId, // Second artist for regular users
        collaboration_type: collaborationType,
        message: message.trim()
      });

      const collaboratorName = collaboratorArtistId 
        ? artists.find(a => a.id === collaboratorArtistId)?.name 
        : null;

      toast({
        title: 'Request sent!',
        description: collaboratorName
          ? `Your request for ${artistName} + ${collaboratorName} collaboration has been sent`
          : `Your collaboration request has been sent to ${artistName}`,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/my-collab-requests');
      }
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 409) {
        toast({
          title: 'MONTHLY LIMIT REACHED',
          description: 'You have used all your collab requests for this month.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Failed to send request',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive'
      });
    }
  };

  if (limitLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!canRequest) {
    const resetDate = limitData?.resetDate ? new Date(limitData.resetDate) : new Date();
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Monthly Limit Reached
          </CardTitle>
          <CardDescription>
            You've used all {limitData?.limit} collaboration requests this month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              You can make new requests starting on{' '}
              <strong>{resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
            </AlertDescription>
          </Alert>
        </CardContent>
        {onCancel && (
          <CardFooter>
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>
          </CardFooter>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>
            {isArtist 
              ? `Request Collaboration with ${artistName}`
              : `Request Collaboration Between Artists`
            }
          </CardTitle>
          <CardDescription>
            <span>You have <strong>{remaining} request{remaining !== 1 ? 's' : ''}</strong> remaining this month</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Artist Selector - Only for regular users */}
          {!isArtist && (
            <div className="space-y-3">
              <Label htmlFor="collaborator">
                Who should collaborate with {artistName}? <span className="text-destructive">*</span>
              </Label>
              <Select 
                value={collaboratorArtistId?.toString() || ''} 
                onValueChange={(v) => setCollaboratorArtistId(parseInt(v))}
              >
                <SelectTrigger id="collaborator" className="w-full">
                  <SelectValue placeholder="Select an artist..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingArtists ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Loading artists...
                    </div>
                  ) : (
                    artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id.toString()}>
                        {artist.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/50 rounded-lg">
                <Users className="h-4 w-4" />
                <span>
                  You're requesting a collaboration between <strong>{artistName}</strong> and another artist
                </span>
              </div>
            </div>
          )}

          {/* Collaboration Type */}
          <div className="space-y-3">
            <Label>What would you like to collaborate on?</Label>
            <RadioGroup value={collaborationType} onValueChange={(v) => setCollaborationType(v as 'song' | 'album')}>
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="song" id="type-song" />
                <Label htmlFor="type-song" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <Music className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Song Collaboration</div>
                    <div className="text-sm text-muted-foreground">Work together on a single track</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-lg p-4 hover:bg-accent cursor-pointer">
                <RadioGroupItem value="album" id="type-album" />
                <Label htmlFor="type-album" className="flex items-center gap-2 flex-1 cursor-pointer">
                  <Disc className="h-4 w-4" />
                  <div>
                    <div className="font-medium">Album Collaboration</div>
                    <div className="text-sm text-muted-foreground">Collaborate on a full album or EP</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Your Message <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="message"
              placeholder={
                isArtist
                  ? "Describe your collaboration idea, what you bring to the table, and why you'd like to work with this artist..."
                  : "Describe why these artists should collaborate, your vision for the collaboration, and what makes this pairing special..."
              }
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={500}
              className="resize-none"
            />
            <div className="text-xs text-muted-foreground text-right">
              {message.length}/500 characters
            </div>
          </div>

          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              {isArtist 
                ? "The artist will receive your request and can respond directly. You'll be notified of their decision."
                : "Both artists will receive your collaboration request. They can approve or decline based on their interest."
              }
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="gap-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={createMutation.isPending || !message.trim() || (!isArtist && !collaboratorArtistId)}
            className="flex-1"
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Request
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
