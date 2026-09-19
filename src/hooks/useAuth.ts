'use client';

import { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { AppUser } from '@/lib/types';

export interface UseAuthResult {
  user: User | null;
  userData: AppUser | null;
  isAdmin: boolean;
  isInspector: boolean;
  loading: boolean;
  needsOnboarding: boolean;
  error: string | null;
}

export const AuthContext = createContext<UseAuthResult | null>(null);

export function useAuth(): UseAuthResult {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}