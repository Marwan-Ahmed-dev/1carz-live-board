'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  User as UserIcon,
  Mail,
  Calendar,
  Car as CarIcon,
  X,
  Plus,
  Loader2,
  Users as UsersIcon,
} from 'lucide-react';
import { subscribeToUsers, validateUsername } from '@/lib/users';
import { subscribeToGroups } from '@/lib/groups';
import { createUserByAdmin } from '@/lib/auth';
import { AppUser, UserGroup } from '@/lib/types';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { GroupManager } from '@/components/admin/GroupManager';
import { subscribeToCars } from '@/lib/cars';
import { useToast } from '@/hooks/useToast';

function formatDate(ts: unknown): string {
  if (!ts) return '-';
  try {
    const date =
      typeof ts === 'object' && ts && 'toDate' in ts
        ? (ts as { toDate: () => Date }).toDate()
        : new Date(ts as string | number | Date);
    return new Intl.DateTimeFormat('en-GB', {
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
  const { showToast } = useToast();
  const [tab, setTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [carsCount, setCarsCount] = useState(0);
  const [perUidCount, setPerUidCount] = useState<Record<string, number>>({});
  const [allCount, setAllCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    const unsubUsers = subscribeToUsers((u) => {
      setUsers(u);
      setLoading(false);
    });
    const unsubGroups = subscribeToGroups(setGroups);
    const unsubCars = subscribeToCars((cars) => {
      setCarsCount(cars.length);
      const counts: Record<string, number> = {};
      let shared = 0;
      cars.forEach((c) => {
        const hasAll = c.assigned_to.includes('all');
        if (hasAll) shared++;
        c.assigned_to.forEach((u) => {
          if (u === 'all') return;
          counts[u] = (counts[u] || 0) + 1;
        });
      });
      setPerUidCount(counts);
      setAllCount(shared);
    });
    return () => {
      unsubUsers();
      unsubGroups();
      unsubCars();
    };
  }, []);

  const countForUser = (uid: string): number => (perUidCount[uid] || 0) + allCount;

  const groupsForUser = (uid: string): string[] =>
    groups.filter((g) => g.memberUids.includes(uid)).map((g) => g.name);

  const filteredUsers = useMemo(() => {
    let list = users;
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

  const SelectedUserCars = ({ uid }: { uid: string }) => {
    const [cars, setCars] = useState<Array<{ id?: string; title: string; code: string; image_url: string }>>([]);
    const [carsLoading, setCarsLoading] = useState(true);
    useEffect(() => {
      const unsub = subscribeToCars(
        (c) => {
          setCars(
            c.filter(
              (car) => car.assigned_to.includes(uid) || car.assigned_to.includes('all')
            )
          );
          setCarsLoading(false);
        },
        { onError: () => setCarsLoading(false) }
      );
      return () => unsub();
    }, [uid]);
    return (
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {carsLoading ? (
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
                <div className="text-xs text-admin-text-muted">{c.code}</div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);
    const nameErr = validateUsername(newName);
    if (nameErr) {
      setCreateError(nameErr);
      return;
    }
    setCreating(true);
    try {
      await createUserByAdmin({
        name: newName,
        email: newEmail,
        password: newPassword,
      });
      showToast('تم إنشاء الحساب بنجاح', 'success');
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
    } catch (err: unknown) {
      setCreateError((err as Error)?.message || 'فشل إنشاء الحساب');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-admin-text">إدارة المستخدمين والمجموعات</h1>
          <p className="text-sm text-admin-text-muted mt-1">
            {users.length} مستخدم · {groups.length} مجموعة · {carsCount} عربية
          </p>
        </div>
        {tab === 'users' && (
          <button
            onClick={() => {
              setCreateError(null);
              setCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm"
          >
            <Plus size={16} />
            مستخدم جديد
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('users')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-bold ${
            tab === 'users'
              ? 'bg-admin-accent text-admin-bg'
              : 'bg-admin-card border border-admin-border text-admin-text-muted'
          }`}
        >
          المستخدمون
        </button>
        <button
          onClick={() => setTab('groups')}
          className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl text-sm font-bold ${
            tab === 'groups'
              ? 'bg-admin-accent text-admin-bg'
              : 'bg-admin-card border border-admin-border text-admin-text-muted'
          }`}
        >
          المجموعات
        </button>
      </div>

      {tab === 'groups' ? (
        <GroupManager users={users} groups={groups} />
      ) : (
        <>
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

          {loading && <LoadingState count={4} variant="list" />}

          {!loading && filteredUsers.length === 0 && (
            <EmptyState
              icon={<UserIcon size={40} className="text-admin-text-muted" />}
              title="لا يوجد مستخدمين"
              description="أنشئ حساباً من زر مستخدم جديد"
            />
          )}

          {!loading && filteredUsers.length > 0 && (
            <div className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden">
              <ul className="divide-y divide-admin-border">
                {filteredUsers.map((u) => {
                  const userGroups = groupsForUser(u.uid);
                  return (
                    <li
                      key={u.uid}
                      className="p-3 hover:bg-admin-bg transition-colors flex items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-admin-accent/15 flex items-center justify-center flex-shrink-0">
                        <UserIcon size={22} className="text-admin-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-admin-text truncate">
                          {u.username || u.email.split('@')[0]}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-admin-text-muted mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail size={11} />
                            {u.email}
                          </span>
                        </div>
                        {userGroups.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {userGroups.map((g) => (
                              <span
                                key={g}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-admin-accent/15 text-admin-accent text-[10px] font-bold"
                              >
                                <UsersIcon size={10} />
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
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
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}

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
                <h3 className="text-lg font-bold text-admin-text">
                  عربيات {selectedUser.username || selectedUser.email}
                </h3>
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

      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            className="bg-admin-card border border-admin-border rounded-2xl w-full max-w-md p-5 modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-admin-text">إنشاء حساب مستخدم</h3>
              <button
                onClick={() => !creating && setCreateOpen(false)}
                className="w-8 h-8 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X size={16} className="text-admin-text-muted" />
              </button>
            </div>
            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-sm font-bold text-admin-text-muted mb-1">الاسم</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="اسم المستخدم"
                  maxLength={20}
                  className="w-full px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-admin-text-muted mb-1">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text"
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-admin-text-muted mb-1">
                  كلمة المرور
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="6 أحرف على الأقل"
                  minLength={6}
                  className="w-full px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text"
                  required
                  dir="ltr"
                />
              </div>
              {createError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
                  {createError}
                </div>
              )}
              <button
                type="submit"
                disabled={creating}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm disabled:opacity-60"
              >
                {creating ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                إنشاء الحساب
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
