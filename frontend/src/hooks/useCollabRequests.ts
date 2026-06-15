import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, PaginatedResponse } from '@/lib/api-client';

export interface CollabRequest {
  id: number;
  requester_id: string | number;
  requester_name: string;
  requester_email: string;
  requester_is_artist?: boolean;
  requester_artist_id?: number;
  artist_id: number;
  artist_name: string;
  collaborator_artist_id?: number | null; // Second artist for fan requests
  collaborator_artist_name?: string | null; // Second artist name
  collaboration_type: 'song' | 'album';
  message: string;
  status:
    | 'PENDING'
    | 'PARTIALLY_APPROVED'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'COMPLETED';
  created_at: number;
  updated_at: number;
  responded_at?: number;
  response_message?: string;
  linked_request_id?: number | null; // ID of the paired request for the other artist
  approval_status?: {
    artist_1_approved: boolean;
    artist_2_approved: boolean;
    artist_1_id: number;
    artist_2_id: number;
  };
}

export interface MonthlyLimit {
  count: number;
  limit: number;
  remaining: number;
  canRequest: boolean;
  resetDate: string | null;
}

interface BackendCollabRequest {
  id: number;
  requester_id: number;
  requester: { email: string; display_name: string | null };
  artist_id: number;
  artist: { name: string };
  collaborator_artist_id: number | null;
  collaborator_artist: { name: string } | null;
  collab_type: 'FEATURE' | 'PRODUCTION' | 'WRITING' | 'OTHER';
  message: string;
  status:
    | 'PENDING'
    | 'PARTIALLY_APPROVED'
    | 'APPROVED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'COMPLETED';
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  response_message: string | null;
  linked_request_id: number | null;
}

function normalizeRequest(request: BackendCollabRequest): CollabRequest {
  return {
    id: request.id,
    requester_id: request.requester_id,
    requester_name: request.requester.display_name || request.requester.email,
    requester_email: request.requester.email,
    artist_id: request.artist_id,
    artist_name: request.artist.name,
    collaborator_artist_id: request.collaborator_artist_id,
    collaborator_artist_name: request.collaborator_artist?.name ?? null,
    collaboration_type: 'song',
    message: request.message,
    status: request.status,
    created_at: new Date(request.created_at).getTime(),
    updated_at: new Date(request.updated_at).getTime(),
    responded_at: request.responded_at
      ? new Date(request.responded_at).getTime()
      : undefined,
    response_message: request.response_message ?? undefined,
    linked_request_id: request.linked_request_id,
  };
}

function groupRequests(requests: CollabRequest[]) {
  return {
    pending: requests.filter((request) => request.status === 'PENDING'),
    partially_approved: requests.filter(
      (request) => request.status === 'PARTIALLY_APPROVED',
    ),
    approved: requests.filter((request) => request.status === 'APPROVED'),
    rejected: requests.filter((request) => request.status === 'REJECTED'),
    completed: requests.filter((request) => request.status === 'COMPLETED'),
  };
}

/**
 * Hook to get user's own collaboration requests
 */
export function useMyCollabRequests() {
  return useQuery<{ requests: CollabRequest[]; limit: MonthlyLimit }>({
    queryKey: ['collab-requests', 'my-requests'],
    queryFn: async () => {
      const [requestsResponse, limit] = await Promise.all([
        apiRequest<PaginatedResponse<BackendCollabRequest>>(
          '/collab-requests/my-requests',
        ),
        apiRequest<{ used: number; limit: number; remaining: number }>(
          '/collab-requests/limit-check',
        ),
      ]);
      return {
        requests: requestsResponse.data.map(normalizeRequest),
        limit: {
          count: limit.used,
          limit: limit.limit,
          remaining: limit.remaining,
          canRequest: limit.remaining > 0,
          resetDate: null,
        },
      };
    }
  });
}

/**
 * Hook to get collaboration requests for owned artist
 */
export function useArtistCollabRequests() {
  return useQuery<{
    requests: CollabRequest[];
    grouped: {
      pending: CollabRequest[];
      partially_approved: CollabRequest[];
      approved: CollabRequest[];
      rejected: CollabRequest[];
      completed: CollabRequest[];
    };
    counts: {
      total: number;
      pending: number;
      partially_approved: number;
      approved: number;
      rejected: number;
      completed: number;
    };
  }>({
    queryKey: ['collab-requests', 'for-artist'],
    queryFn: async () => {
      const response = await apiRequest<PaginatedResponse<BackendCollabRequest>>(
        '/collab-requests/for-artist',
      );
      const requests = response.data.map(normalizeRequest);
      const grouped = groupRequests(requests);
      return {
        requests,
        grouped,
        counts: {
          total: requests.length,
          pending: grouped.pending.length,
          partially_approved: grouped.partially_approved.length,
          approved: grouped.approved.length,
          rejected: grouped.rejected.length,
          completed: grouped.completed.length,
        },
      };
    }
  });
}

/**
 * Hook to check monthly request limit
 */
export function useCollabRequestLimit() {
  return useQuery<MonthlyLimit>({
    queryKey: ['collab-requests', 'limit'],
    queryFn: async () => {
      const limit = await apiRequest<{ used: number; limit: number; remaining: number }>(
        '/collab-requests/limit-check',
      );
      return {
        count: limit.used,
        limit: limit.limit,
        remaining: limit.remaining,
        canRequest: limit.remaining > 0,
        resetDate: null,
      };
    }
  });
}

/**
 * Hook to create a new collaboration request
 */
export function useCreateCollabRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      artist_id: number;
      collaborator_artist_id?: number | null; // NEW: Second artist
      collaboration_type: 'song' | 'album';
      message: string;
    }) => {
      return apiRequest<BackendCollabRequest>('/collab-requests', {
        method: 'POST',
        body: JSON.stringify({
          artist_id: data.artist_id,
          collaborator_artist_id: data.collaborator_artist_id,
          collab_type: data.collaboration_type === 'album' ? 'PRODUCTION' : 'FEATURE',
          message: data.message,
        }),
      }).then(normalizeRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-requests'] });
    }
  });
}

/**
 * Hook to respond to a collaboration request (artist only)
 */
export function useRespondToCollabRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      requestId: number;
      status: 'approved' | 'rejected';
      response_message?: string;
    }) => {
      return apiRequest<BackendCollabRequest>(
        `/collab-requests/${data.requestId}/respond`,
        {
          method: 'PUT',
          body: JSON.stringify({
            action: data.status === 'rejected' ? 'reject' : 'approve',
            response_message: data.response_message,
          }),
        },
      ).then(normalizeRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-requests'] });
    }
  });
}

/**
 * Hook to cancel a collaboration request
 */
export function useCancelCollabRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest<BackendCollabRequest>(`/collab-requests/${requestId}`, {
        method: 'DELETE',
      }).then(normalizeRequest);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-requests'] });
    }
  });
}
