'use client';

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { watchAuth, ensureUserDoc, getUserData, refreshClaims } from '@/lib/auth';
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

export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isInspector, setIsInspector] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const unsub = watchAuth(async (u) => {
      const thisGen = ++generation;
      const fbUser = u as User | null;
      if (cancelled) return;
      setUser(fbUser);
      setError(null);
      if (!fbUser) {
        setUserData(null);
        setIsAdmin(false);
        setIsInspector(false);
        setLoading(false);
        return;
      }
      try {
        await ensureUserDoc(fbUser);
        if (cancelled || thisGen !== generation) return;
        const data = await getUserData(fbUser.uid);
        if (cancelled || thisGen !== generation) return;
        setUserData(data);
        const { isAdmin: adminFlag, isInspector: inspectorFlag } = await refreshClaims();
        if (cancelled || thisGen !== generation) return;
        setIsAdmin(adminFlag);
        setIsInspector(inspectorFlag || data?.role === 'inspector');
      } catch (err) {
        console.error('useAuth: failed to load user data', err);
        if (cancelled || thisGen !== generation) return;
        setUserData(null);
        setIsAdmin(false);
        setIsInspector(false);
        setError('فشل تحميل بيانات الحساب. حاول تحديث الصفحة.');
      } finally {
        if (!cancelled && thisGen === generation) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const needsOnboarding = !!user && userData !== null && userData.username === null;

  return { user, userData, isAdmin, isInspector, loading, needsOnboarding, error };
}
