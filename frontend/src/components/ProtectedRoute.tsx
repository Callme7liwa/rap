import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/store/auth.store';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
