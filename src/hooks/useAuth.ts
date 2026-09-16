'use client';

// hook مركزي لإدارة حالة الـ Auth
// يُرجع: user object (من Firebase Auth), userData (من Firestore), isAdmin, loading

import { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { watchAuth, ensureUserDoc, getUserData } from '@/lib/auth';
import { AppUser } from '@/lib/types';
import { refreshClaims } from '@/lib/auth';

export interface UseAuthResult {
  user: User | null;
  userData: AppUser | null;
  isAdmin: boolean;
  loading: boolean;
  needsOnboarding: boolean;
}

/**
 * Hook رئيسي للـ Auth
 * - يستمع لـ auth state changes
 * - يجلب user document من Firestore
 * - يتحقق من admin custom claim
 * - يحدد إذا كان يحتاج onboarding (username === null)
 */
export function useAuth(): UseAuthResult {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = watchAuth(async (u) => {
      const fbUser = u as User | null;
      if (cancelled) return;
      setUser(fbUser);
      if (!fbUser) {
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        // تأكد من وجود وثيقة المستخدم (تُنشأ تلقائياً عند أول دخول)
        await ensureUserDoc(fbUser);
        // اجلب البيانات من Firestore
        const data = await getUserData(fbUser.uid);
        if (cancelled) return;
        setUserData(data);
        // اجلب الـ custom claims
        const { isAdmin: adminFlag } = await refreshClaims();
        if (cancelled) return;
        setIsAdmin(adminFlag);
      } catch (err) {
        console.error('useAuth: failed to load user data', err);
        if (!cancelled) setUserData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  const needsOnboarding = !!user && userData !== null && userData.username === null;

  return { user, userData, isAdmin, loading, needsOnboarding };
}