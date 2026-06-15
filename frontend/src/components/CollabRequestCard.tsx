import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRespondToCollabRequest, type CollabRequest } from '@/hooks/useCollabRequests';
import { Music, Disc, Calendar, User, Mail, MessageSquare, Loader2, CheckCircle2, XCircle, Crown, Users, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CollabRequestCardProps {
  request: CollabRequest;
  mode: 'artist' | 'requester';
  onCancel?: () => void;
}

export function CollabRequestCard({ request, mode, onCancel }: CollabRequestCardProps) {
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [responseType, setResponseType] = useState<'approved' | 'rejected'>('approved');
  const [responseMessage, setResponseMessage] = useState('');
  const { toast } = useToast();
  const respondMutation = useRespondToCollabRequest();

  const statusColors = {
    PENDING: 'border-yellow-500 text-yellow-500',
    PARTIALLY_APPROVED: 'border-blue-400 text-blue-400',
    APPROVED: 'border-green-500 text-green-500',
    REJECTED: 'border-destructive text-destructive',
    CANCELLED: 'border-muted-foreground text-muted-foreground',
    COMPLETED: 'border-primary text-primary',
  };

  const statusLabels = {
    PENDING: 'PENDING',
    PARTIALLY_APPROVED: 'AWAITING 2ND APPROVAL',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
    COMPLETED: 'COMPLETED',
  };

  const isActionable =
    request.status === 'PENDING' || request.status === 'PARTIALLY_APPROVED';

  const handleRespond = async () => {
    try {
      await respondMutation.mutateAsync({
        requestId: request.id,
        status: responseType,
        response_message: responseMessage.trim()
      });

      toast({
        title: 'Response sent',
        description: `Request has been ${responseType}`,
      });

      setShowRespondDialog(false);
      setResponseMessage('');
    } catch (error) {
      toast({
        title: 'Failed to respond',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive'
      });
    }
  };

  const openRespondDialog = (type: 'approved' | 'rejected') => {
    setResponseType(type);
    setShowRespondDialog(true);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              {request.collaboration_type === 'song' ? (
                <Music className="h-5 w-5 text-primary" />
              ) : (
                <Disc className="h-5 w-5 text-primary" />
              )}
              <div>
                <CardTitle className="text-lg">
                  {request.collaboration_type === 'song' ? 'Song' : 'Album'} Collaboration
                </CardTitle>
                <CardDescription>
                  {mode === 'artist' ? (
                    <>Request from {request.requester_name}</>
                  ) : request.collaborator_artist_name ? (
                    <>
                      Request for <strong>{request.artist_name}</strong> + <strong>{request.collaborator_artist_name}</strong>
                    </>
                  ) : (
                    <>Request to {request.artist_name}</>
                  )}
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={`${statusColors[request.status]} rounded-none uppercase tracking-widest`}>
              {statusLabels[request.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Request Details */}
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                {formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}
              </span>
            </div>
            {mode === 'artist' && (
              <>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span className="flex items-center gap-2">
                    {request.requester_name}
                    {request.requester_is_artist && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <Crown className="h-3 w-3 text-yellow-500" />
                        Artist
                      </Badge>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>{request.requester_email}</span>
                </div>
                {/* Show collaborator artist if this is a fan-requested collaboration */}
                {request.collaborator_artist_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      Collaboration with: <strong>{request.collaborator_artist_name}</strong>
                    </span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Request Message */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Request Message</Label>
            <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">
              {request.message}
            </div>
          </div>

          {/* Response Message (if exists) */}
          {request.response_message && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-2">
                <MessageSquare className="h-3 w-3" />
                Artist Response
              </Label>
              <div className="bg-accent p-3 rounded-lg text-sm whitespace-pre-wrap border-l-4 border-primary">
                {request.response_message}
              </div>
            </div>
          )}

          {/* Partial Approval Status (for linked requests) */}
          {request.status === 'PARTIALLY_APPROVED' && request.collaborator_artist_name && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3 text-orange-500" />
                Approval Status
              </Label>
              <div className="bg-orange-50 dark:bg-orange-950 p-3 rounded-lg text-sm border-l-4 border-orange-500">
                <div className="space-y-2">
                  {/* Show which artist approved */}
                  {request.approval_status && (
                    <>
                      <div className="flex items-center gap-2">
                        {request.approval_status.artist_1_approved ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={request.approval_status.artist_1_approved ? 'font-medium text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                          {request.artist_name}: {request.approval_status.artist_1_approved ? 'Approved' : 'Not yet responded'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {request.approval_status.artist_2_approved ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={request.approval_status.artist_2_approved ? 'font-medium text-green-700 dark:text-green-400' : 'text-muted-foreground'}>
                          {request.collaborator_artist_name}: {request.approval_status.artist_2_approved ? 'Approved' : 'Not yet responded'}
                        </span>
                      </div>
                    </>
                  )}
                  {!request.approval_status && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">One artist approved this collaboration!</span>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Waiting for both artists to approve before collaboration can begin.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>

        {/* Action Buttons */}
        {mode === 'artist' && isActionable && (
          <CardFooter className="gap-2">
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => openRespondDialog('approved')}
              disabled={respondMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Approve
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={() => openRespondDialog('rejected')}
              disabled={respondMutation.isPending}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject
            </Button>
          </CardFooter>
        )}

        {mode === 'requester' && onCancel && isActionable && (
          <CardFooter>
            <button
              type="button"
              onClick={onCancel}
              className="border border-destructive text-destructive uppercase text-xs tracking-widest px-4 py-2 rounded-none hover:bg-destructive/10"
            >
              CANCEL
            </button>
          </CardFooter>
        )}
      </Card>

      {/* Response Dialog */}
      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {responseType === 'approved' && 'Approve Collaboration Request'}
              {responseType === 'rejected' && 'Reject Collaboration Request'}
            </DialogTitle>
            <DialogDescription>
              {responseType === 'approved' && 'Let the fan know you\'re interested in collaborating'}
              {responseType === 'rejected' && 'Politely decline this collaboration request'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="response">
                Your Message (Optional)
              </Label>
              <Textarea
                id="response"
                placeholder={
                  responseType === 'approved'
                    ? 'Share your contact details or next steps...'
                    : 'Optionally explain why you\'re declining...'
                }
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-muted-foreground text-right">
                {responseMessage.length}/500 characters
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRespondDialog(false)}
              disabled={respondMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleRespond}
              disabled={respondMutation.isPending}
              variant={responseType === 'rejected' ? 'destructive' : 'default'}
            >
              {respondMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
