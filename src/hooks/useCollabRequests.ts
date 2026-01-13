import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authenticatedFetch } from '@/lib/auth-helper';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8089/api';

export interface CollabRequest {
  id: number;
  requester_id: string;
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
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled' | 'partially_approved';
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
  limit: number | string; // 'unlimited' for artists
  remaining: number | string; // 'unlimited' for artists
  canRequest: boolean;
  resetDate: string | null;
  isArtist?: boolean;
}

/**
 * Hook to get user's own collaboration requests
 */
export function useMyCollabRequests() {
  return useQuery<{ requests: CollabRequest[]; limit: MonthlyLimit }>({
    queryKey: ['collab-requests', 'my-requests'],
    queryFn: async () => {
      const response = await authenticatedFetch(`${API_BASE}/collab-requests/my-requests`);
      if (!response.ok) throw new Error('Failed to fetch requests');
      return response.json();
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
      const response = await authenticatedFetch(`${API_BASE}/collab-requests/for-artist`);
      if (!response.ok) throw new Error('Failed to fetch artist requests');
      return response.json();
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
      const response = await authenticatedFetch(`${API_BASE}/collab-requests/limit-check`);
      if (!response.ok) throw new Error('Failed to check limit');
      return response.json();
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
      const response = await authenticatedFetch(`${API_BASE}/collab-requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to create request' }));
        throw new Error(error.error || error.message || 'Failed to create request');
      }

      return response.json();
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
      status: 'approved' | 'rejected' | 'completed';
      response_message?: string;
    }) => {
      const response = await authenticatedFetch(
        `${API_BASE}/collab-requests/${data.requestId}/respond`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: data.status,
            response_message: data.response_message
          })
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to respond' }));
        throw new Error(error.error || error.message || 'Failed to respond');
      }

      return response.json();
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
      const response = await authenticatedFetch(
        `${API_BASE}/collab-requests/${requestId}`,
        {
          method: 'DELETE'
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to cancel' }));
        throw new Error(error.error || error.message || 'Failed to cancel request');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collab-requests'] });
    }
  });
}
