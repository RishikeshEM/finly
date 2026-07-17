'use client';

/**
 * Auth context: holds the current user and access-token lifecycle.
 * Access token lives in memory; the refresh token is an httpOnly cookie
 * managed entirely by the backend.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, setAccessToken } from './api-client';

export interface User {
  id: string;
  email: string;
  preferred_currency: string;
  country: string;
  timezone: string;
  notification_prefs: Record<string, boolean>;
  role: string;
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  async function fetchCurrentUser() {
    const res = await apiClient.get<User>('/users/me');
    setUser(res.data);
  }

  useEffect(() => {
    // Attempt silent session restore on app load via the httpOnly refresh cookie.
    (async () => {
      try {
        const res = await apiClient.post('/auth/refresh');
        setAccessToken(res.data.accessToken);
        await fetchCurrentUser();
      } catch {
        setAccessToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function login(email: string, password: string) {
    const res = await apiClient.post('/auth/login', { email, password });
    setAccessToken(res.data.accessToken);
    await fetchCurrentUser();
  }

  async function register(email: string, password: string) {
    const res = await apiClient.post('/auth/register', { email, password });
    setAccessToken(res.data.accessToken);
    await fetchCurrentUser();
  }

  function logout() {
    setAccessToken(null);
    setUser(null);
    router.push('/');
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refetchUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
