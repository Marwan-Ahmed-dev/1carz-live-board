'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
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
  Trash2,
  Shield,
  Eye,
  Phone,
  SlidersHorizontal,
} from 'lucide-react';
import { subscribeToUsers, validateUsername, deleteUserByAdmin, updateDailyBuyerLimit } from '@/lib/users';
import { subscribeToGroups } from '@/lib/groups';
import { createUserByAdmin } from '@/lib/auth';
import { AppUser, DEFAULT_DAILY_BUYER_LIMIT, UserGroup } from '@/lib/types';
import { LoadingState } from '@/components/LoadingState';
import { EmptyState } from '@/components/EmptyState';
import { GroupManager } from '@/components/admin/GroupManager';
import { subscribeToCars } from '@/lib/cars';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';
import { ConfirmDialog, useConfirm } from '@/components/ConfirmDialog';

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

function isMarketerAccount(
  u: AppUser,
  adminUids: Set<string>,
  inspectorUids: Set<string>
): boolean {
  if (adminUids.has(u.uid) || u.role === 'admin') return false;
  if (inspectorUids.has(u.uid) || u.role === 'inspector') return false;
  return true;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { confirm, dialogProps } = useConfirm();
  const currentUid = user?.uid;
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
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin' | 'inspector'>('user');
  const [newGroupId, setNewGroupId] = useState('');
  const [newDailyLimit, setNewDailyLimit] = useState(String(DEFAULT_DAILY_BUYER_LIMIT));
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [adminUids, setAdminUids] = useState<Set<string>>(new Set());
  const [inspectorUids, setInspectorUids] = useState<Set<string>>(new Set());
  const [editLimit, setEditLimit] = useState('');
  const [savingLimit, setSavingLimit] = useState(false);
  const [limitEditUser, setLimitEditUser] = useState<AppUser | null>(null);

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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await user.getIdToken(true);
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { admins?: string[]; inspectors?: string[] };
        if (!cancelled) {
          setAdminUids(new Set(data.admins || []));
          setInspectorUids(new Set(data.inspectors || []));
        }
      } catch {
        /* keep empty — badges optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

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
          u.email.toLowerCase().includes(s) ||
          (u.phone || '').includes(s)
      );
    }
    return list;
  }, [users, search]);

  const SelectedUserCars = ({ uid }: { uid: string }) => {
    const [cars, setCars] = useState<Array<{ id?: string; title: string; image_url: string }>>([]);
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
              <div className="relative w-12 h-12 rounded-lg bg-admin-card overflow-hidden flex-shrink-0 striped-bg">
                {c.image_url && (
                  <Image src={c.image_url} alt={c.title} fill sizes="48px" className="object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-admin-text truncate">{c.title}</div>
                <div className="text-xs text-admin-text-muted truncate">{c.title}</div>
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
      const created = await createUserByAdmin({
        name: newName,
        email: newEmail,
        password: newPassword,
        phone: newPhone,
        role: newRole,
        groupId: newGroupId || undefined,
        daily_buyer_limit:
          newRole === 'user' ? Math.floor(Number(newDailyLimit)) || DEFAULT_DAILY_BUYER_LIMIT : undefined,
      });
      if (created.role === 'admin' && created.uid) {
        setAdminUids((prev) => new Set(prev).add(created.uid));
      }
      if (created.role === 'inspector' && created.uid) {
        setInspectorUids((prev) => new Set(prev).add(created.uid));
      }
      const toastMsg =
        newRole === 'admin'
          ? 'تم إنشاء حساب أدمن'
          : newRole === 'inspector'
            ? 'تم إنشاء حساب معاين'
            : 'تم إنشاء حساب مسوّق';
      showToast(toastMsg, 'success');
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewPhone('');
      setNewRole('user');
      setNewGroupId('');
      setNewDailyLimit(String(DEFAULT_DAILY_BUYER_LIMIT));
    } catch (err: unknown) {
      setCreateError((err as Error)?.message || 'فشل إنشاء الحساب');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteUser = async (target: AppUser) => {
    const label = target.username || target.email;
    const targetIsAdmin = adminUids.has(target.uid) || target.role === 'admin';
    const targetIsInspector = inspectorUids.has(target.uid) || target.role === 'inspector';
    const message = targetIsAdmin
      ? `هل تريد حذف حساب الأدمن "${label}"؟\nلن يتمكن من الدخول للوحة التحكم بعد ذلك.\nهذا الإجراء لا يمكن التراجع عنه.`
      : targetIsInspector
        ? `هل تريد حذف حساب المعاين "${label}"؟\nلن يتمكن من إضافة عربيات بعد ذلك.\nهذا الإجراء لا يمكن التراجع عنه.`
        : `هل تريد حذف حساب "${label}"؟\nلن يتمكن من تسجيل الدخول بعد ذلك.\nهذا الإجراء لا يمكن التراجع عنه.`;
    const ok = await confirm({
      title: 'حذف الحساب',
      message,
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(target.uid);
    try {
      await deleteUserByAdmin(target);
      setAdminUids((prev) => {
        const next = new Set(prev);
        next.delete(target.uid);
        return next;
      });
      setInspectorUids((prev) => {
        const next = new Set(prev);
        next.delete(target.uid);
        return next;
      });
      if (selectedUser?.uid === target.uid) setSelectedUser(null);
      showToast('تم حذف الحساب', 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'فشل حذف الحساب', 'error');
    } finally {
      setDeletingId(null);
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
              setNewRole('user');
              setNewGroupId('');
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
                  const marketer = isMarketerAccount(u, adminUids, inspectorUids);
                  const dailyLimit = u.daily_buyer_limit ?? DEFAULT_DAILY_BUYER_LIMIT;
                  return (
                    <li
                      key={u.uid}
                      className="p-3 hover:bg-admin-bg transition-colors flex items-center gap-3"
                    >
                      <div className="w-12 h-12 rounded-full bg-admin-accent/15 flex items-center justify-center flex-shrink-0">
                        <UserIcon size={22} className="text-admin-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-admin-text truncate flex items-center gap-1.5 flex-wrap">
                          {u.username || u.email.split('@')[0]}
                          {(adminUids.has(u.uid) || u.role === 'admin') && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-admin-accent/15 text-admin-accent text-[10px] font-bold">
                              <Shield size={10} />
                              أدمن
                            </span>
                          )}
                          {(inspectorUids.has(u.uid) || u.role === 'inspector') && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-sky-500/15 text-sky-400 text-[10px] font-bold">
                              <Eye size={10} />
                              معاين
                            </span>
                          )}
                          {marketer && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[10px] font-bold">
                              مسوق
                            </span>
                          )}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-admin-text-muted mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail size={11} />
                            {u.email}
                          </span>
                          {u.phone && (
                            <span className="flex items-center gap-1" dir="ltr">
                              <Phone size={11} />
                              {u.phone}
                            </span>
                          )}
                          {marketer && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-admin-bg text-admin-accent font-bold">
                              حد يومي: {dailyLimit}
                            </span>
                          )}
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
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {marketer && (
                          <button
                            type="button"
                            onClick={() => {
                              setLimitEditUser(u);
                              setEditLimit(String(dailyLimit));
                            }}
                            className="flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                            aria-label="تعديل حد المشترين"
                          >
                            <SlidersHorizontal size={16} className="text-emerald-400" />
                            <span className="badge-number text-sm font-bold text-emerald-400">
                              {dailyLimit}
                            </span>
                            <span className="text-[10px] text-emerald-400/80">الحد</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setEditLimit(String(dailyLimit));
                          }}
                          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg bg-admin-bg hover:bg-admin-border transition-colors"
                        >
                          <CarIcon size={16} className="text-admin-accent" />
                          <span className="badge-number text-base font-bold text-admin-accent">
                            {countForUser(u.uid)}
                          </span>
                          <span className="text-[10px] text-admin-text-muted">عربية</span>
                        </button>
                        {u.uid !== currentUid && (
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={deletingId === u.uid}
                            className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-red-500/15 flex items-center justify-center transition-colors disabled:opacity-50"
                            aria-label="حذف الحساب"
                          >
                            {deletingId === u.uid ? (
                              <Loader2 size={16} className="text-red-400 animate-spin" />
                            ) : (
                              <Trash2 size={16} className="text-admin-text-muted hover:text-red-400" />
                            )}
                          </button>
                        )}
                      </div>
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
                className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X size={16} className="text-admin-text-muted" />
              </button>
            </div>
            {!adminUids.has(selectedUser.uid) &&
              selectedUser.role !== 'admin' &&
              !inspectorUids.has(selectedUser.uid) &&
              selectedUser.role !== 'inspector' && (
                <div className="mb-4 p-3 rounded-xl bg-admin-bg border border-admin-border space-y-2">
                  <label className="block text-xs font-bold text-admin-text-muted">
                    حد المشترين اليومي
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={1}
                      max={500}
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-admin-card border border-admin-border text-admin-text text-sm"
                      dir="ltr"
                    />
                    <button
                      type="button"
                      disabled={savingLimit}
                      onClick={async () => {
                        setSavingLimit(true);
                        try {
                          await updateDailyBuyerLimit(selectedUser.uid, Number(editLimit));
                          showToast('تم تحديث الحد اليومي', 'success');
                          setSelectedUser({
                            ...selectedUser,
                            daily_buyer_limit: Math.floor(Number(editLimit)),
                          });
                        } catch (err: unknown) {
                          showToast((err as Error)?.message || 'فشل التحديث', 'error');
                        } finally {
                          setSavingLimit(false);
                        }
                      }}
                      className="px-3 py-2 rounded-xl bg-admin-accent text-admin-bg text-sm font-bold disabled:opacity-60"
                    >
                      {savingLimit ? <Loader2 size={14} className="animate-spin" /> : 'حفظ'}
                    </button>
                  </div>
                </div>
              )}
            <SelectedUserCars uid={selectedUser.uid} />
          </div>
        </div>
      )}

      {limitEditUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => !savingLimit && setLimitEditUser(null)}
        >
          <div
            className="bg-admin-card border border-admin-border rounded-2xl w-full max-w-sm p-5 modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-admin-text">تعديل حد المشترين</h3>
                <p className="text-xs text-admin-text-muted mt-0.5">
                  {limitEditUser.username || limitEditUser.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => !savingLimit && setLimitEditUser(null)}
                className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X size={16} className="text-admin-text-muted" />
              </button>
            </div>
            <p className="text-sm text-admin-text-muted mb-3">
              كام مشتري يقدر المسوّق يسجّلهم في اليوم الواحد؟
            </p>
            <label className="block text-xs font-bold text-admin-text-muted mb-1.5">
              الحد اليومي
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={editLimit}
              onChange={(e) => setEditLimit(e.target.value)}
              className="w-full px-3 py-3 rounded-xl bg-admin-bg border border-admin-border text-admin-text text-base font-bold mb-4"
              dir="ltr"
            />
            <button
              type="button"
              disabled={savingLimit}
              onClick={async () => {
                setSavingLimit(true);
                try {
                  const value = Math.floor(Number(editLimit));
                  await updateDailyBuyerLimit(limitEditUser.uid, value);
                  showToast(`تم تحديث الحد إلى ${value}`, 'success');
                  setLimitEditUser(null);
                } catch (err: unknown) {
                  showToast((err as Error)?.message || 'فشل التحديث', 'error');
                } finally {
                  setSavingLimit(false);
                }
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm disabled:opacity-60"
            >
              {savingLimit ? <Loader2 size={16} className="animate-spin" /> : null}
              حفظ الحد
            </button>
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
              <h3 className="text-lg font-bold text-admin-text">إنشاء حساب</h3>
              <button
                onClick={() => !creating && setCreateOpen(false)}
                className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center"
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
                  رقم التليفون
                </label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="01xxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text"
                  required
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-admin-text-muted mb-1">
                  المجموعة
                </label>
                <select
                  value={newGroupId}
                  onChange={(e) => setNewGroupId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text"
                >
                  <option value="">بدون مجموعة</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-admin-text-muted mb-2">نوع الحساب</label>
                <div className="space-y-3">
                  {(
                    [
                      { value: 'user', label: 'مسوق' },
                      { value: 'inspector', label: 'معاين' },
                      { value: 'admin', label: 'ادمن' },
                    ] as const
                  ).map((opt) => (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 min-h-11 px-2 py-2 rounded-xl cursor-pointer hover:bg-admin-bg"
                    >
                      <input
                        type="radio"
                        name="account-role"
                        checked={newRole === opt.value}
                        onChange={() => setNewRole(opt.value)}
                        className="w-5 h-5 border-admin-border text-admin-accent"
                      />
                      <span className="text-sm font-bold text-admin-text">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {newRole === 'user' && (
                <div>
                  <label className="block text-sm font-bold text-admin-text-muted mb-1">
                    حد المشترين اليومي
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={newDailyLimit}
                    onChange={(e) => setNewDailyLimit(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text"
                    required
                    dir="ltr"
                  />
                  <p className="text-xs text-admin-text-muted mt-1">افتراضي {DEFAULT_DAILY_BUYER_LIMIT}</p>
                </div>
              )}
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
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
