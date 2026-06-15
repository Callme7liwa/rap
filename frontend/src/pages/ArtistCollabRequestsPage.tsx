import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { CollabRequestCard } from '@/components/CollabRequestCard';
import { useArtistCollabRequests } from '@/hooks/useCollabRequests';
import { Loader2, Bell, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export function ArtistCollabRequestsPage() {
  const { data, isLoading, error } = useArtistCollabRequests();
  const [activeTab, setActiveTab] = useState('pending');

  if (isLoading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to load collaboration requests';
    const is403 = errorMessage.includes('403') || errorMessage.includes('Forbidden');
    
    return (
      <div className="container mx-auto py-12">
        <Alert variant={is403 ? 'default' : 'destructive'}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {is403 ? (
              <>
                <strong>Artist Association Required</strong>
                <p className="mt-2">
                  You need to be associated with an artist to view collaboration requests.
                  Only artists can receive and respond to collaboration requests from fans.
                </p>
              </>
            ) : (
              errorMessage
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const counts = data?.counts || { pending: 0, approved: 0, rejected: 0, completed: 0, total: 0 };
  const grouped = data?.grouped || { pending: [], approved: [], rejected: [], completed: [] };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <Bell className="h-8 w-8" />
          Collaboration Requests
        </h1>
        <p className="text-muted-foreground">
          Manage collaboration requests from fans who want to work with you
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              {counts.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Partially Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              {counts.partially_approved || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              {counts.approved}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              {counts.rejected}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              {counts.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Requests Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="pending" className="relative">
            Pending
            {counts.pending > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {counts.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="partially_approved" className="relative">
            Partial
            {(counts.partially_approved || 0) > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {counts.partially_approved}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="approved">
            Approved
            {counts.approved > 0 && (
              <span className="ml-2 bg-green-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {counts.approved}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6 space-y-4">
          {grouped.pending.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending requests</p>
              </CardContent>
            </Card>
          ) : (
            grouped.pending.map((request) => (
              <CollabRequestCard key={request.id} request={request} mode="artist" />
            ))
          )}
        </TabsContent>

        <TabsContent value="partially_approved" className="mt-6 space-y-4">
          {(grouped.partially_approved || []).length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 text-orange-500" />
                <p>No partially approved requests</p>
                <p className="text-sm mt-2">These are collaborations where one artist has approved but the other hasn't responded yet</p>
              </CardContent>
            </Card>
          ) : (
            (grouped.partially_approved || []).map((request) => (
              <CollabRequestCard key={request.id} request={request} mode="artist" />
            ))
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6 space-y-4">
          {grouped.approved.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No approved requests</p>
              </CardContent>
            </Card>
          ) : (
            grouped.approved.map((request) => (
              <CollabRequestCard key={request.id} request={request} mode="artist" />
            ))
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6 space-y-4">
          {grouped.rejected.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rejected requests</p>
              </CardContent>
            </Card>
          ) : (
            grouped.rejected.map((request) => (
              <CollabRequestCard key={request.id} request={request} mode="artist" />
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-6 space-y-4">
          {grouped.completed.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No completed collaborations</p>
              </CardContent>
            </Card>
          ) : (
            grouped.completed.map((request) => (
              <CollabRequestCard key={request.id} request={request} mode="artist" />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
