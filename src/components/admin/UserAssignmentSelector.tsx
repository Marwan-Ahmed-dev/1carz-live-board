'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X, Users as UsersIcon, UserCheck } from 'lucide-react';
import { subscribeToUsers } from '@/lib/users';
import { AppUser } from '@/lib/types';

interface UserAssignmentSelectorProps {
  /** القيم الحالية — قيم الـ UIDs (أو 'all') */
  value: string[]; // ['all'] أو ['uid1', 'uid2']
  onChange: (val: string[]) => void;
}

/**
 * Multi-select component لتحديد المستخدمين المعينين لعربية
 * - وضع 1: "الكل" (assigned_to = ['all'])
 * - وضع 2: "مستخدمين محددين" (checkbox list لكل المستخدمين المسجلين)
 *
 * ✅ FIX: بنعرض كل المستخدمين (حتى اللي ما عملوش onboarding لسه)
 *    لأن الـ assignment بيستخدم الـ UID (مش الـ username).
 */
export function UserAssignmentSelector({ value, onChange }: UserAssignmentSelectorProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // الاشتراك في real-time updates
  useEffect(() => {
    const unsub = subscribeToUsers((all) => {
      // ✅ FIX: بنعرض كل المستخدمين، مش بس الـ onboarded
      // (الـ assignment بيستخدم الـ UID اللي موجود لكل user)
      console.log('[UserAssignmentSelector] users snapshot:', all.length, all.map((u) => u.uid));
      setUsers(all);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const isAll = value.length === 1 && value[0] === 'all';
  const selected = isAll ? [] : value;

  // قائمة المستخدمين بعد الفلترة بالبحث
  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const s = search.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(s) ||
        u.email.toLowerCase().includes(s) ||
        u.uid.toLowerCase().includes(s)
    );
  }, [users, search]);

  // ✅ نـtoggle بالـ UID (مش الـ username)
  // FIX: لو الـ user أفرغ كل التحديدات، نفضل في وضع "مستخدمين محددين"
  // (مش بنرجع تلقائياً لـ ['all']) عشان الـ UX ما يتلخبطش.
  const toggleUser = (uid: string) => {
    if (isAll) return; // معطّل في وضع "الكل"
    const newVal = selected.includes(uid)
      ? selected.filter((u) => u !== uid)
      : [...selected, uid];
    onChange(newVal);
  };

  const setAllMode = () => {
    onChange(['all']);
  };

  // ✅ FIX: لو كنا في "الكل" وفارغين، حوّل لـ [] (مش ['all']) عشان فعلاً
  // ندخل في وضع "مستخدمين محددين". قبل كده كان بيرجع ['all'] فيبقى ثابت في "الكل".
  // الـ validation في CarForm بيتعامل مع [] برسالة واضحة عند الحفظ.
  const setSpecificMode = () => {
    onChange([]);
  };

  // helper لعرض اسم المستخدم — username لو موجود، غير كده email
  const displayName = (u: AppUser): string => u.username || u.email.split('@')[0];

  return (
    <div className="space-y-3">
      {/* اختيار الوضع */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={setAllMode}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
            isAll
              ? 'bg-admin-accent text-admin-bg'
              : 'bg-admin-bg border border-admin-border text-admin-text-muted hover:text-admin-text'
          }`}
        >
          <UsersIcon size={16} className="inline-block ml-1" />
          الكل
        </button>
        <button
          type="button"
          onClick={setSpecificMode}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-bold transition-colors ${
            !isAll
              ? 'bg-admin-accent text-admin-bg'
              : 'bg-admin-bg border border-admin-border text-admin-text-muted hover:text-admin-text'
          }`}
        >
          <UserCheck size={16} className="inline-block ml-1" />
          مستخدمين محددين
        </button>
      </div>

      {/* قائمة المستخدمين (تظهر فقط في وضع "مستخدمين محددين") */}
      {!isAll && (
        <div className="bg-admin-bg border border-admin-border rounded-xl overflow-hidden">
          {/* شريط البحث */}
          <div className="p-3 border-b border-admin-border">
            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالاسم أو الإيميل..."
                className="w-full pr-9 pl-3 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text text-sm placeholder:text-admin-text-muted focus:border-admin-accent/50"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-admin-text-muted hover:text-admin-text"
                  aria-label="مسح البحث"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* القائمة */}
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-admin-text-muted text-sm">
                جاري التحميل...
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-admin-text-muted text-sm">
                {users.length === 0
                  ? 'لا يوجد مستخدمين مسجلين بعد — اطلب من المستخدمين تسجيل الدخول أولاً'
                  : 'لا توجد نتائج — جرّب كلمة بحث أخرى'}
              </div>
            ) : (
              <ul className="divide-y divide-admin-border">
                {filteredUsers.map((u) => {
                  const isSelected = selected.includes(u.uid);
                  const isOnboarded = u.username !== null;
                  return (
                    <li key={u.uid}>
                      <label className="flex items-center gap-3 px-3 py-2.5 hover:bg-admin-card cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUser(u.uid)}
                          className="w-4 h-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-admin-text truncate">
                              {displayName(u)}
                            </span>
                            {!isOnboarded && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-admin-text-muted/20 text-admin-text-muted">
                                لم يستكمل
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-admin-text-muted truncate">
                            {u.email}
                          </div>
                        </div>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* ملخص */}
          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-admin-border bg-admin-card/50">
              <span className="badge-number text-xs text-admin-accent font-bold">
                {selected.length} مستخدم محدد
              </span>
            </div>
          )}
        </div>
      )}

      {/* في وضع "الكل" */}
      {isAll && (
        <div className="bg-admin-card border border-admin-border rounded-xl p-4 text-sm text-admin-text-muted text-center">
          ✓ ستظهر هذه العربية لجميع المستخدمين
        </div>
      )}
    </div>
  );
}