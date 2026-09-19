'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { User } from 'firebase/auth';
import { watchAuth, ensureUserDoc, getUserData, refreshClaims } from '@/lib/auth';
import { AppUser } from '@/lib/types';
import { AuthContext, type UseAuthResult } from '@/hooks/useAuth';
import { ToastProvider } from '@/hooks/useToast';
import { ShortcutPromptHost } from '@/components/ShortcutPromptHost';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInspector, setIsInspector] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const unsub = watchAuth(async (u) => {
      const thisGen = ++generation;
      const fbUser = u as User | null;
      if (cancelled) return;
      setLoading(true);
      setError(null);
      if (!fbUser) {
        setUser(null);
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
        const { isAdmin: adminFlag, isInspector: inspectorFlag } = await refreshClaims();
        if (cancelled || thisGen !== generation) return;
        // Set role + user together so header never flashes the wrong button
        setUser(fbUser);
        setUserData(data);
        setIsAdmin(adminFlag);
        setIsInspector(inspectorFlag || data?.role === 'inspector');
      } catch (err) {
        console.error('AuthProvider: failed to load user data', err);
        if (cancelled || thisGen !== generation) return;
        setUser(fbUser);
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

  const value = useMemo<UseAuthResult>(
    () => ({
      user,
      userData,
      isAdmin,
      isInspector,
      loading,
      needsOnboarding: !!user && userData !== null && userData.username === null,
      error,
    }),
    [user, userData, isAdmin, isInspector, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        {children}
        <ShortcutPromptHost />
      </ToastProvider>
    </AuthProvider>
  );
}