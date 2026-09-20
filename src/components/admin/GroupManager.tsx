'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Users as UsersIcon,
  Search,
  Loader2,
  ChevronDown,
  ChevronLeft,
} from 'lucide-react';
import { AppUser, UserGroup } from '@/lib/types';
import { createGroup, updateGroup, deleteGroup } from '@/lib/groups';
import { useToast } from '@/hooks/useToast';
import { ConfirmDialog, useConfirm } from '@/components/ConfirmDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

interface GroupManagerProps {
  users: AppUser[];
  groups: UserGroup[];
}

function displayName(u: AppUser): string {
  return u.username || u.email.split('@')[0] || u.uid;
}

export function GroupManager({ users, groups }: GroupManagerProps) {
  const { showToast } = useToast();
  const { confirm, dialogProps } = useConfirm();
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<UserGroup | null>(null);
  const [name, setName] = useState('');
  const [memberUids, setMemberUids] = useState<string[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const usersById = useMemo(() => {
    const map = new Map<string, AppUser>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  // M28: debounce both search inputs
  const debouncedSearch = useDebouncedValue(search, 250);
  const debouncedUserSearch = useDebouncedValue(userSearch, 250);

  const filteredGroups = useMemo(() => {
    if (!debouncedSearch.trim()) return groups;
    const s = debouncedSearch.trim().toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(s));
  }, [groups, debouncedSearch]);

  const modalUsers = useMemo(() => {
    if (!debouncedUserSearch.trim()) return users;
    const s = debouncedUserSearch.trim().toLowerCase();
    return users.filter(
      (u) => u.username?.toLowerCase().includes(s) || u.email.toLowerCase().includes(s)
    );
  }, [users, debouncedUserSearch]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setMemberUids([]);
    setUserSearch('');
    setModalOpen(true);
  };

  const openEdit = (group: UserGroup) => {
    setEditing(group);
    setName(group.name);
    setMemberUids([...group.memberUids]);
    setUserSearch('');
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
  };

  const toggleMember = (uid: string) => {
    setMemberUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('اسم المجموعة مطلوب', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateGroup(editing.id, { name, memberUids });
        showToast('تم تحديث المجموعة', 'success');
      } else {
        await createGroup(name, memberUids);
        showToast('تم إنشاء المجموعة', 'success');
      }
      setModalOpen(false);
      setEditing(null);
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'فشل حفظ المجموعة', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (group: UserGroup) => {
    const ok = await confirm({
      title: 'حذف مجموعة',
      message: `حذف مجموعة "${group.name}"؟\nلن يتم حذف المستخدمين.`,
      confirmLabel: 'حذف',
      cancelLabel: 'إلغاء',
      variant: 'danger',
    });
    if (!ok) return;
    setDeletingId(group.id);
    try {
      await deleteGroup(group.id);
      showToast('تم حذف المجموعة', 'success');
    } catch (err: unknown) {
      showToast((err as Error)?.message || 'فشل حذف المجموعة', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen, saving]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-admin-text-muted">{groups.length} مجموعة</p>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm"
        >
          <Plus size={16} />
          مجموعة جديدة
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث باسم المجموعة..."
          className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-admin-card border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50 text-sm"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <div className="bg-admin-card border border-admin-border rounded-2xl p-8 text-center">
          <UsersIcon size={40} className="mx-auto text-admin-text-muted mb-3" />
          <h3 className="text-lg font-bold text-admin-text mb-1">لا توجد مجموعات</h3>
          <p className="text-sm text-admin-text-muted">أنشئ مجموعة ثم أضف إليها المستخدمين</p>
        </div>
      ) : (
        <div className="bg-admin-card border border-admin-border rounded-2xl overflow-hidden">
          <ul className="divide-y divide-admin-border">
            {filteredGroups.map((group) => {
              const isOpen = expanded[group.id];
              const members = group.memberUids
                .map((uid) => usersById.get(uid))
                .filter((u): u is AppUser => Boolean(u));
              return (
                <li key={group.id}>
                  <div className="p-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setExpanded((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                      }
                      className="flex-1 flex items-center gap-3 min-w-0 text-right"
                    >
                      <div className="w-10 h-10 rounded-xl bg-admin-accent/15 flex items-center justify-center flex-shrink-0">
                        <UsersIcon size={18} className="text-admin-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-admin-text truncate">{group.name}</h3>
                        <p className="text-xs text-admin-text-muted">
                          {group.memberUids.length} مستخدم
                        </p>
                      </div>
                      {isOpen ? (
                        <ChevronDown size={16} className="text-admin-text-muted" />
                      ) : (
                        <ChevronLeft size={16} className="text-admin-text-muted" />
                      )}
                    </button>
                    <button
                      onClick={() => openEdit(group)}
                      className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center"
                      aria-label="تعديل المجموعة"
                    >
                      <Pencil size={15} className="text-admin-text-muted" />
                    </button>
                    <button
                      onClick={() => handleDelete(group)}
                      disabled={deletingId === group.id}
                      className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-red-500/15 flex items-center justify-center disabled:opacity-50"
                      aria-label="حذف المجموعة"
                    >
                      {deletingId === group.id ? (
                        <Loader2 size={15} className="text-red-400 animate-spin" />
                      ) : (
                        <Trash2 size={15} className="text-admin-text-muted hover:text-red-400" />
                      )}
                    </button>
                  </div>
                  {isOpen && (
                    <div className="px-3 pb-3">
                      {members.length === 0 ? (
                        <p className="text-xs text-admin-text-muted bg-admin-bg rounded-xl px-3 py-2">
                          لا يوجد مستخدمون في هذه المجموعة
                        </p>
                      ) : (
                        <ul className="space-y-1 bg-admin-bg rounded-xl p-2">
                          {members.map((u) => (
                            <li key={u.uid} className="flex items-center justify-between gap-2 px-2 py-1.5">
                              <span className="text-sm text-admin-text truncate">{displayName(u)}</span>
                              <span className="text-xs text-admin-text-muted truncate">{u.email}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={closeModal}
        >
          <div
            className="bg-admin-card border border-admin-border rounded-2xl w-full max-w-md p-5 modal-in max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-admin-text">
                {editing ? 'تعديل المجموعة' : 'مجموعة جديدة'}
              </h3>
              <button
                onClick={closeModal}
                className="w-11 h-11 rounded-lg bg-admin-bg hover:bg-admin-border flex items-center justify-center"
                aria-label="إغلاق"
              >
                <X size={16} className="text-admin-text-muted" />
              </button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-hidden flex flex-col gap-3">
              <div>
                <label className="block text-sm font-bold text-admin-text-muted mb-1">
                  اسم المجموعة
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: مجموعة القاهرة"
                  className="w-full px-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text placeholder:text-admin-text-muted focus:border-admin-accent/50"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <label className="block text-sm font-bold text-admin-text-muted mb-1">
                  الأعضاء ({memberUids.length})
                </label>
                <div className="relative mb-2">
                  <Search
                    size={14}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted"
                  />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="ابحث عن مستخدم..."
                    className="w-full pr-8 pl-3 py-2 rounded-lg bg-admin-bg border border-admin-border text-admin-text text-sm placeholder:text-admin-text-muted"
                  />
                </div>
                <ul className="flex-1 overflow-y-auto max-h-64 border border-admin-border rounded-xl divide-y divide-admin-border">
                  {modalUsers.length === 0 ? (
                    <li className="p-3 text-sm text-admin-text-muted text-center">لا يوجد مستخدمون</li>
                  ) : (
                    modalUsers.map((u) => (
                      <li key={u.uid}>
                        <label className="flex items-center gap-3 px-3 py-2 hover:bg-admin-bg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={memberUids.includes(u.uid)}
                            onChange={() => toggleMember(u.uid)}
                            className="w-4 h-4 rounded border-admin-border text-admin-accent"
                          />
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-admin-text truncate">
                              {displayName(u)}
                            </div>
                            <div className="text-xs text-admin-text-muted truncate">{u.email}</div>
                          </div>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-admin-accent hover:bg-yellow-400 text-admin-bg font-bold text-sm disabled:opacity-60"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                  {editing ? 'حفظ التعديلات' : 'إنشاء المجموعة'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-admin-text text-sm"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {dialogProps && <ConfirmDialog {...dialogProps} />}
    </div>
  );
}
