'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User as UserIcon, Mail, Calendar, Car as CarIcon, X } from 'lucide-react';
import { subscribeToUsers } from '@/lib/users';
import { AppUser } from '@/lib/types';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { subscribeToCars } from '@/lib/cars';

function formatDate(ts: any): string {
  if (!ts) return '-';
  try {
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch {
    return '-';
  }
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [carsCount, setCarsCount] = useState(0);
  // لكل uid عدد العربيات المخصصة ليه (مباشرة)
  const [perUidCount, setPerUidCount] = useState<Record<string, number>>({});
  // للمستخدمين اللي عندهم ['all'] عربية — كلهم يستحقوا +1 لكل عربة
  // (نحسبها بشكل منفصل عشان نعرف نضيفها لكل مستخدم)
  const [allCount, setAllCount] = useState(0);
  // modal
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);

  useEffect(() => {
    const unsubUsers = subscribeToUsers((u) => {
      setUsers(u);
      setLoading(false);
    });
    const unsubCars = subscribeToCars((cars) => {
      setCarsCount(cars.length);
      // ✅ FIX: assigned_to مخزّن بـ UIDs (مش usernames).
      // حساب العدد لكل UID + عد العربيات اللي assigned_to فيها 'all'.
      const counts: Record<string, number> = {};
      let allCount = 0;
      cars.forEach((c) => {
        const hasAll = c.assigned_to.includes('all');
        if (hasAll) allCount++;
        c.assigned_to.forEach((u) => {
          if (u === 'all') return; // بنعدها منفصلة
          counts[u] = (counts[u] || 0) + 1;
        });
      });
      setPerUidCount(counts);
      setAllCount(allCount);
    });
    return () => {
      unsubUsers();
      unsubCars();
    };
  }, []);

  // helper: عدد العربيات الفعلي للمستخدم = UID-specific + 'all' shared
  const countForUser = (uid: string): number => {
    return (perUidCount[uid] || 0) + allCount;
  };

  const onboarded = useMemo(() => {
    let list = users.filter((u) => u.username !== null);
    if (search.trim()) {
      const s = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.username?.toLowerCase().includes(s) ||
          u.email.toLowerCase().includes(s)
      );
    }
    return list;
  }, [users, search]);

  // سيارات المستخدم المختار
  const userCars = useMemo(() => {
    if (!selectedUser || !selectedUser.uid) return [];
    // الـ modal بيستخدم SelectedUserCars component منفصل، فنرجع []
    return [];
  }, [selectedUser]);

  // استخدام modal بسيط لعرض العربيات
  const SelectedUserCars = ({ uid }: { uid: string }) => {
    const [cars, setCars] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
      const unsub = subscribeToCars((c) => {
        // ✅ FIX: بنفلتر بالـ UID (مش الـ username) عشان assigned_to مخزّن بـ UIDs
        setCars(
          c.filter(
            (car) => car.assigned_to.includes(uid) || car.assigned_to.includes('all')
          )
        );
        setLoading(false);
      });
      return () => unsub();
    }, [uid]);
    return (
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4 text-admin-text-muted text-sm">جاري التحميل...</div>
        ) : cars.length === 0 ? (
          <div className="text-center py-4 text-admin-text-muted text-sm">لا توجد عربيات مخصصة</div>
        ) : (
          cars.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-admin-bg cursor-pointer hover:bg-admin-border/50"
              onClick={() => {
                setSelectedUser(null);
                router.push(`/admin/cars/${c.id}`);
              }}
            >
              <div className="w-12 h-12 rounded-lg bg-admin-card overflow-hidden flex-shrink-0 striped-bg">
                {c.image_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image_url} alt={c.title} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-admin-text truncate">{c.title}</div>
                <div className="text-xs text-admin-text-muted">
                  {c.code}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-admin-text">إدارة المستخدمين</h1>
        <p className="text-sm text-admin-text-muted mt-1">
          {onboarded.length} مستخدم مسجل · {carsCount} عربية
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث بالاسم أو الإيميل..."
          className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50 text-sm"
        />
      </div>

      {/* Loading */}
      {loading && <LoadingState count={4} variant="list" />}

      {/* Empty */}
      {!loading && onboarded.length === 0 && (
        <EmptyState
          icon={<UserIcon size={40} className="text-admin-text-muted" />}
          title="لا يوجد مستخدمين"
          description="بمجرد ما يسجل مستخدم ويختار اسم، هيظهر هنا"
        />
      )}

      {/* List */}
      {!loading && onboarded.length > 0 && (
        <div className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden">
          <ul className="divide-y divide-admin-border">
            {onboarded.map((u) => (
              <li
                key={u.uid}
                className="p-3 hover:bg-admin-bg transition-colors flex items-center gap-3"
              >
                {/* Avatar placeholder */}
                <div className="w-12 h-12 rounded-full bg-admin-accent/15 flex items-center justify-center flex-shrink-0">
                  <UserIcon size={22} className="text-admin-accent" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-admin-text truncate">
                      {u.username}
                    </h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-admin-text-muted mt-0.5">
                    <span className="flex items-center gap-1">
                      <Mail size={11} />
                      {u.email}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-admin-text-muted mt-1">
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      انضم: {formatDate(u.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={11} />
                      آخر ظهور: {formatDate(u.last_seen)}
                    </span>
                  </div>
                </div>

                {/* Cars count */}
                <button
                  onClick={() => setSelectedUser(u)}
                  className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-admin-bg hover:bg-admin-border transition-colors"
                >
                  <CarIcon size={16} className="text-admin-accent" />
                  <span className="badge-number text-base font-bold text-admin-accent">
                    {countForUser(u.uid)}
                  </span>
                  <span className="text-[10px] text-admin-text-muted">عربية</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal: عرض عربيات المستخدم */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-admin-card border border-admin-border rounded-2xl w-full max-w-md p-5 modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-admin-text">عربيات {selectedUser.username}</h3>
                <p className="text-xs text-admin-text-muted">{selectedUser.email}</p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X size={16} className="text-admin-text-muted" />
              </button>
            </div>
            <SelectedUserCars uid={selectedUser.uid} />
          </div>
        </div>
      )}
    </div>
  );
}