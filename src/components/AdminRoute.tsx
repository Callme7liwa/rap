import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { fetchAuthSession } from 'aws-amplify/auth';
import { toast } from 'sonner';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute component to protect admin-only pages
 * Checks if user is authenticated AND has admin role
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, authStatus } = useAuthenticator((context) => [context.user, context.authStatus]);
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authStatus === 'authenticated' && user) {
        try {
          const session = await fetchAuthSession();
          const groups = session.tokens?.accessToken?.payload['cognito:groups'] as string[] | undefined;
          const hasAdminAccess = groups?.includes('admin') || false;
          setIsAdmin(hasAdminAccess);
          
          // Show error toast if not admin
          if (!hasAdminAccess) {
            toast.error('Admin Access Required', {
              description: 'You need administrator privileges to access this page.'
            });
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          setIsAdmin(false);
          toast.error('Authentication Error', {
            description: 'Failed to verify admin access.'
          });
        }
      } else if (authStatus === 'unauthenticated') {
        toast.error('Authentication Required', {
          description: 'Please sign in to access admin pages.'
        });
      }
      setLoading(false);
    };

    checkAdminStatus();
  }, [authStatus, user]);

  // Show nothing while checking auth
  if (authStatus === 'configuring' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (authStatus !== 'authenticated' || !user) {
    return <Navigate to="/" replace state={{ from: '/admin' }} />;
  }

  // Check if user has admin role
  if (isAdmin === false) {
    // Redirect non-admin users to home with error message
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center max-w-md p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Admin Access Required</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            This page is restricted to administrators only. You need to be in the admin group to access this area.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Return to Home
          </a>
        </div>
      </div>
    );
  }

  // Render admin content
  return <>{children}</>;
}
