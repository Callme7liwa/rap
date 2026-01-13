import { fetchAuthSession } from 'aws-amplify/auth';

/**
 * Helper function to make authenticated API requests
 * Automatically adds the JWT token from Cognito to the Authorization header
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    // Get the current auth session
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();

    if (!token) {
      throw new Error('No authentication token available');
    }

    // Add Authorization header
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    // Make the request
    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error('Authentication error:', error);
    throw error;
  }
}
