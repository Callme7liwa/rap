import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CollabRequestCard } from '@/components/CollabRequestCard';
import { useMyCollabRequests } from '@/hooks/useCollabRequests';
import { Loader2, Send, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function MyCollabRequestsPage() {
  const { data, isLoading, error } = useMyCollabRequests();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-12">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load your requests'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const requests = data?.requests || [];
  const limit = data?.limit;
  const resetDate = limit?.resetDate ? new Date(limit.resetDate) : null;

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Send className="h-8 w-8" />
          My Collaboration Requests
        </h1>
        <p className="text-muted-foreground">
          Track your collaboration requests to artists
        </p>
      </div>

      {/* Monthly Limit Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {limit?.isArtist ? 'Artist Status' : 'Monthly Request Limit'}
          </CardTitle>
          <CardDescription>
            {limit?.isArtist 
              ? 'As an artist, you have unlimited collaboration requests'
              : `You can make ${limit?.limit} collaboration requests per month`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {limit?.isArtist ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                You are associated with an artist and can send unlimited collaboration requests to other artists.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Requests used this month</p>
                  <p className="text-2xl font-bold">
                    {limit?.count} / {limit?.limit}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold">
                    {limit?.remaining}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Resets on</p>
                  <p className="font-semibold">
                    {resetDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              
              {limit?.canRequest ? (
                <Alert className="mt-4">
                  <AlertDescription>
                    You can still make {limit.remaining} more request{limit.remaining !== 1 ? 's' : ''} this month
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert className="mt-4" variant="destructive">
                  <AlertDescription>
                    You've reached your monthly limit. You can make new requests on{' '}
                    {resetDate?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Requests List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Requests ({requests.length})</h2>
          <Button onClick={() => navigate('/artists')} variant="outline">
            Browse Artists
          </Button>
        </div>

        {requests.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Send className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">You haven't made any collaboration requests yet</p>
              <Button onClick={() => navigate('/artists')}>
                Browse Artists
              </Button>
            </CardContent>
          </Card>
        ) : (
          requests.map((request) => (
            <CollabRequestCard key={request.id} request={request} mode="requester" />
          ))
        )}
      </div>
    </div>
  );
}
