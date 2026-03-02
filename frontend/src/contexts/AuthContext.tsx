'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@/types';
import * as api from '@/lib/api';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (name: string, phone: string, agreed: boolean) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'meditech_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUser(JSON.parse(stored) as User);
      }
    } catch {
      /* ignore corrupt data */
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (name: string, phone: string, agreed: boolean) => {
      setLoading(true);
      try {
        const res = await api.guestLogin(name, phone, agreed);
        const userData: User = {
          id: res.user_id,
          name,
          phone,
          role: res.role,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
        setUser(userData);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
