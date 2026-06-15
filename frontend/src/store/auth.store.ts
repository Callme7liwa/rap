import {
  createContext,
  createElement,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

export type AuthRole = 'USER' | 'ARTIST' | 'ADMIN';

export interface AuthUser {
  id: number;
  email: string;
  display_name: string | null;
  role: AuthRole;
  avatar_url: string | null;
  artist?: {
    id: number;
    name: string;
    slug: string;
  } | null;
}

interface AuthResponse {
  access_token: string;
  user: AuthUser;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput extends LoginInput {
  display_name?: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isArtist: boolean;
}

const AUTH_TOKEN_KEY = 'lyricscape_auth_token';
const AUTH_USER_KEY = 'lyricscape_auth_user';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getStoredAuthUser(): AuthUser | null {
  const rawUser = localStorage.getItem(AUTH_USER_KEY);

  if (!rawUser) {
    return null;
  }

  try {
    return JSON.parse(rawUser) as AuthUser;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    return null;
  }
}

async function submitAuth(path: string, input: LoginInput | RegisterInput) {
  const response = await fetch(`${API_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as
      | { message?: string }
      | null;
    throw new Error(errorBody?.message || 'Authentication failed');
  }

  return (await response.json()) as AuthResponse;
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const [user, setUser] = useState<AuthUser | null>(() => getStoredAuthUser());

  const persistAuth = useCallback((authResponse: AuthResponse) => {
    localStorage.setItem(AUTH_TOKEN_KEY, authResponse.access_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authResponse.user));
    setToken(authResponse.access_token);
    setUser(authResponse.user);
    return authResponse.user;
  }, []);

  const login = useCallback(
    async (input: LoginInput) => persistAuth(await submitAuth('login', input)),
    [persistAuth],
  );

  const register = useCallback(
    async (input: RegisterInput) =>
      persistAuth(await submitAuth('register', input)),
    [persistAuth],
  );

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      login,
      register,
      logout,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === 'ADMIN',
      isArtist: user?.role === 'ARTIST' || user?.role === 'ADMIN',
    }),
    [login, logout, register, token, user],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return context;
}
