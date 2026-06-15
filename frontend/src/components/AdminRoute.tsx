import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/store/auth.store';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * AdminRoute component to protect admin-only pages
 * Checks if user is authenticated AND has admin role
 */
export default function AdminRoute({ children }: AdminRouteProps) {
  const { isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      toast.error('Admin Access Required', {
        description: 'You need administrator privileges to access this page.',
      });
    }
  }, [isAdmin, isAuthenticated]);

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: '/admin' }} />;
  }

  // Check if user has admin role
  if (!isAdmin) {
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
