import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Get the current authentication token
 * Handles token refresh automatically
 * Returns ID token (preferred by backend for user info)
 */
export async function getAuthToken(): Promise<string> {
  try {
    const session = await fetchAuthSession();
    
    // Try ID token first (contains user info), fallback to access token
    const token = session.tokens?.idToken?.toString() || 
                  session.tokens?.accessToken?.toString();
    
    if (!token) {
      // Check localStorage as fallback
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        console.warn('Using stored token from localStorage - session may be expired');
        return storedToken;
      }
      throw new Error('No authentication token available');
    }
    
    // Update localStorage with fresh token
    localStorage.setItem('token', token);
    return token;
  } catch (error) {
    console.error('Error getting auth token:', error);
    // Try localStorage as last resort
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      console.warn('Session fetch failed, using stored token');
      return storedToken;
    }
    throw new Error('Authentication required. Please login again.');
  }
}

/**
 * Make an authenticated API request with automatic token refresh
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    const token = await getAuthToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If we get 401, token might be expired - try to refresh once
    if (response.status === 401) {
      console.log('Got 401, attempting to refresh token...');
      
      // Clear stored token and try to get a fresh one
      localStorage.removeItem('token');
      const freshToken = await getAuthToken();
      
      // Retry the request with fresh token
      const retryHeaders = {
        'Content-Type': 'application/json',
        ...options.headers,
        'Authorization': `Bearer ${freshToken}`,
      };

      return fetch(url, {
        ...options,
        headers: retryHeaders,
      });
    }

    return response;
  } catch (error) {
    console.error('Authenticated fetch error:', error);
    throw error;
  }
}
