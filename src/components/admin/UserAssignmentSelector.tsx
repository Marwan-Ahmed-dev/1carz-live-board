'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, X, Users as UsersIcon, UserCheck, ChevronDown, ChevronLeft } from 'lucide-react';
import { subscribeToUsers } from '@/lib/users';
import { subscribeToGroups } from '@/lib/groups';
import { AppUser, UserGroup } from '@/lib/types';

interface UserAssignmentSelectorProps {
  value: string[];
  onChange: (val: string[]) => void;
}

function displayName(u: AppUser): string {
  return u.username || u.email.split('@')[0];
}

/**
 * اختيار التعيين حسب المجموعات:
 * - الكل
 * - مجموعات قابلة للطي لاختيار المجموعة كلها أو مستخدمين منها
 */
export function UserAssignmentSelector({ value, onChange }: UserAssignmentSelectorProps) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [groups, setGroups] = useState<UserGroup[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unsubUsers = subscribeToUsers((all) => {
      setUsers(all);
      setLoading(false);
    });
    const unsubGroups = subscribeToGroups(setGroups);
    return () => {
      unsubUsers();
      unsubGroups();
    };
  }, []);

  const isAll = value.length === 1 && value[0] === 'all';
  const selected = isAll ? [] : value;
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const query = search.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    if (!query) return users;
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.uid.toLowerCase().includes(query)
    );
  }, [users, query]);

  const usersById = useMemo(() => {
    const map = new Map<string, AppUser>();
    users.forEach((u) => map.set(u.uid, u));
    return map;
  }, [users]);

  const visibleGroups = useMemo(() => {
    if (!query) return groups;
    return groups.filter((g) => {
      if (g.name.toLowerCase().includes(query)) return true;
      return g.memberUids.some((uid) => {
        const u = usersById.get(uid);
        if (!u) return false;
        return (
          u.username?.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query)
        );
      });
    });
  }, [groups, query, usersById]);

  const groupedUids = useMemo(() => new Set(groups.flatMap((g) => g.memberUids)), [groups]);

  const ungroupedUsers = useMemo(
    () => filteredUsers.filter((u) => !groupedUids.has(u.uid)),
    [filteredUsers, groupedUids]
  );

  const toggleUser = (uid: string) => {
    if (isAll) return;
    const next = selectedSet.has(uid)
      ? selected.filter((u) => u !== uid)
      : [...selected, uid];
    onChange(next);
  };

  const toggleGroupMembers = (group: UserGroup) => {
    if (isAll || group.memberUids.length === 0) return;
    const allSelected = group.memberUids.every((uid) => selectedSet.has(uid));
    if (allSelected) {
      const remove = new Set(group.memberUids);
      onChange(selected.filter((uid) => !remove.has(uid)));
      return;
    }
    onChange(Array.from(new Set([...selected, ...group.memberUids])));
  };

  const setAllMode = () => onChange(['all']);
  const setSpecificMode = () => onChange([]);

  const groupState = (group: UserGroup): 'all' | 'some' | 'none' => {
    if (group.memberUids.length === 0) return 'none';
    const count = group.memberUids.filter((uid) => selectedSet.has(uid)).length;
    if (count === 0) return 'none';
    if (count === group.memberUids.length) return 'all';
    return 'some';
  };

  const renderUserRow = (u: AppUser) => {
    const isSelected = selectedSet.has(u.uid);
    const isOnboarded = u.username !== null;
    return (
      <li key={u.uid}>
        <label className="flex items-center gap-3 px-3 py-2 hover:bg-admin-card cursor-pointer">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleUser(u.uid)}
            className="w-4 h-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-admin-text truncate">{displayName(u)}</span>
              {!isOnboarded && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-admin-text-muted/20 text-admin-text-muted">
                  لم يستكمل
                </span>
              )}
            </div>
            <div className="text-xs text-admin-text-muted truncate">{u.email}</div>
          </div>
        </label>
      </li>
    );
  };

  return (
    <div className="space-y-3">
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
          مجموعات ومستخدمين
        </button>
      </div>

      {!isAll && (
        <div className="bg-admin-bg border border-admin-border rounded-xl overflow-hidden">
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
                placeholder="ابحث في المجموعات أو المستخدمين..."
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

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-admin-text-muted text-sm">جاري التحميل...</div>
            ) : groups.length === 0 && users.length === 0 ? (
              <div className="p-4 text-center text-admin-text-muted text-sm">
                لا توجد مجموعات أو مستخدمين بعد — أنشئ مجموعات من صفحة المستخدمين
              </div>
            ) : (
              <ul className="divide-y divide-admin-border">
                {visibleGroups.map((group) => {
                  const isOpen = expanded[group.id] || Boolean(query);
                  const state = groupState(group);
                  const members = group.memberUids
                    .map((uid) => usersById.get(uid))
                    .filter((u): u is AppUser => Boolean(u))
                    .filter((u) => {
                      if (!query) return true;
                      return (
                        u.username?.toLowerCase().includes(query) ||
                        u.email.toLowerCase().includes(query) ||
                        group.name.toLowerCase().includes(query)
                      );
                    });

                  return (
                    <li key={group.id} className="bg-admin-bg">
                      <div className="flex items-center gap-2 px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={state === 'all'}
                          ref={(el) => {
                            if (el) el.indeterminate = state === 'some';
                          }}
                          disabled={group.memberUids.length === 0}
                          onChange={() => toggleGroupMembers(group)}
                          className="w-4 h-4 rounded border-admin-border text-admin-accent focus:ring-admin-accent cursor-pointer"
                          aria-label={`اختيار مجموعة ${group.name}`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExpanded((prev) => ({ ...prev, [group.id]: !prev[group.id] }))
                          }
                          className="flex-1 flex items-center justify-between gap-2 min-w-0 text-right"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-admin-text truncate">
                              {group.name}
                            </div>
                            <div className="text-[11px] text-admin-text-muted">
                              {group.memberUids.length} مستخدم
                              {state === 'some' ? ' · بعض الأعضاء محددون' : ''}
                            </div>
                          </div>
                          {isOpen ? (
                            <ChevronDown size={16} className="text-admin-text-muted flex-shrink-0" />
                          ) : (
                            <ChevronLeft size={16} className="text-admin-text-muted flex-shrink-0" />
                          )}
                        </button>
                      </div>
                      {isOpen && (
                        <ul className="border-t border-admin-border bg-admin-card/40">
                          {members.length === 0 ? (
                            <li className="px-4 py-2 text-xs text-admin-text-muted">
                              لا يوجد مستخدمون في هذه المجموعة
                            </li>
                          ) : (
                            members.map(renderUserRow)
                          )}
                        </ul>
                      )}
                    </li>
                  );
                })}

                {ungroupedUsers.length > 0 && (
                  <li>
                    <div className="px-3 py-2 text-xs font-bold text-admin-text-muted bg-admin-card/40">
                      بدون مجموعة
                    </div>
                    <ul>{ungroupedUsers.map(renderUserRow)}</ul>
                  </li>
                )}
              </ul>
            )}
          </div>

          {selected.length > 0 && (
            <div className="px-3 py-2 border-t border-admin-border bg-admin-card/50">
              <span className="badge-number text-xs text-admin-accent font-bold">
                {selected.length} مستخدم محدد
              </span>
            </div>
          )}
        </div>
      )}

      {isAll && (
        <div className="bg-admin-card border border-admin-border rounded-xl p-4 text-sm text-admin-text-muted text-center">
          ✓ ستظهر هذه العربية لجميع المستخدمين
        </div>
      )}
    </div>
  );
}
