import { ReactNode } from 'react';
import { AuthStoreProvider } from '@/store/auth.store';

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  return <AuthStoreProvider>{children}</AuthStoreProvider>;
}
