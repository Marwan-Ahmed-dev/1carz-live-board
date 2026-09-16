'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { signIn } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading, needsOnboarding, isAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect logic بعد نجاح الـ auth
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (needsOnboarding) {
      router.replace('/onboarding');
    } else if (isAdmin) {
      router.replace('/admin/dashboard');
    } else {
      router.replace('/');
    }
  }, [user, authLoading, needsOnboarding, isAdmin, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      // الـ useEffect هيعمل redirect تلقائياً لما تتحدث حالة الـ auth
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-bg-primary">
      <div className="w-full max-w-md">
        {/* Logo + Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-accent-yellow mb-4 shadow-medium">
            <Car size={40} className="text-text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            1CARZ LIVE BOARD
          </h1>
          <p className="text-text-secondary text-base">لوحة العربيات الحية</p>
        </div>

        {/* Login Card */}
        <div className="bg-bg-card rounded-2xl p-6 sm:p-8 shadow-medium border border-border-soft">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full pr-10 pl-3 py-3 rounded-xl bg-white border border-border-medium text-text-primary placeholder:text-text-muted focus:border-accent-yellow focus:ring-2 focus:ring-accent-yellow/20 transition"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
                كلمة المرور
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete={rememberMe ? 'current-password' : 'off'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pr-10 pl-3 py-3 rounded-xl bg-white border border-border-medium text-text-primary placeholder:text-text-muted focus:border-accent-yellow focus:ring-2 focus:ring-accent-yellow/20 transition"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border-medium text-accent-yellow focus:ring-accent-yellow cursor-pointer"
              />
              <span>تذكرني</span>
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-accent-yellow hover:bg-accent-yellow-hover text-text-primary font-bold text-base shadow-soft transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  جاري الدخول...
                </>
              ) : (
                'تسجيل الدخول'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-text-muted text-xs mt-6">
          © 1CARZ LIVE BOARD · جميع الحقوق محفوظة
        </p>
      </div>
    </main>
  );
}