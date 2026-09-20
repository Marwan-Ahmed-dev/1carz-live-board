'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Search, Users } from 'lucide-react';
import { BuyerLead } from '@/lib/types';
import {
  subscribeToLast30DaysBuyerLeads,
  subscribeToTodaysBuyerLeads,
} from '@/lib/buyers';
import { digitsOnly } from '@/lib/phone';
import { toJsDate } from '@/lib/cairoDay';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const PAGE_SIZE = 10;

type MarketerGroup = {
  key: string;
  name: string;
  phone: string;
  leads: BuyerLead[];
};

function formatLeadDateTime(lead: BuyerLead): string {
  const date = toJsDate(lead.created_at);
  if (!date) return '—';
  return new Intl.DateTimeFormat('ar-EG', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function groupKey(lead: BuyerLead): string {
  if (lead.marketer_uid) return lead.marketer_uid;
  return `name:${lead.marketer_name || ''}|phone:${lead.marketer_phone || ''}`;
}

export function BuyersPanel() {
  const [tab, setTab] = useState<'today' | 'all'>('today');
  const [todayLeads, setTodayLeads] = useState<BuyerLead[]>([]);
  const [allLeads, setAllLeads] = useState<BuyerLead[]>([]);
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    const unsubToday = subscribeToTodaysBuyerLeads(setTodayLeads);
    const unsubAll = subscribeToLast30DaysBuyerLeads(setAllLeads);
    return () => {
      unsubToday();
      unsubAll();
    };
  }, []);

  useEffect(() => {
    setVisible(PAGE_SIZE);
    setSearch('');
    setExpandedKey(null);
  }, [tab]);

  const source = tab === 'today' ? todayLeads : allLeads;
  // M28: debounce search — الـ user list filter ما يعملش على كل ضغطة
  const debouncedSearch = useDebouncedValue(search, 250);

  const filtered = useMemo(() => {
    const qDigits = digitsOnly(debouncedSearch);
    const qText = debouncedSearch.trim().toLowerCase();
    if (!qDigits && !qText) return source;
    return source.filter((lead) => {
      const buyerPhone = digitsOnly(lead.phone);
      const marketerPhone = digitsOnly(lead.marketer_phone || '');
      const marketerName = (lead.marketer_name || '').toLowerCase();
      const buyerName = (lead.name || '').toLowerCase();
      const phoneMatch =
        !!qDigits && (buyerPhone.includes(qDigits) || marketerPhone.includes(qDigits));
      const textMatch =
        !!qText && (marketerName.includes(qText) || buyerName.includes(qText));
      return phoneMatch || textMatch;
    });
  }, [source, debouncedSearch]);

  const groups = useMemo(() => {
    const map = new Map<string, MarketerGroup>();
    for (const lead of filtered) {
      const key = groupKey(lead);
      const existing = map.get(key);
      if (existing) {
        existing.leads.push(lead);
        if (!existing.name && lead.marketer_name) existing.name = lead.marketer_name;
        if (!existing.phone && lead.marketer_phone) existing.phone = lead.marketer_phone;
      } else {
        map.set(key, {
          key,
          name: lead.marketer_name || 'مسوّق بدون اسم',
          phone: lead.marketer_phone || '',
          leads: [lead],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.leads.length - a.leads.length);
  }, [filtered]);

  const shown = groups.slice(0, visible);
  const hasMore = groups.length > visible;

  return (
    <div className="bg-admin-card border border-admin-border rounded-2xl p-4 sm:p-5">
      <div className="flex items-start gap-2 mb-4">
        <div className="w-11 h-11 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center flex-shrink-0">
          <Users size={18} />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-admin-text">بيانات المشترين</h3>
          <p className="text-xs text-admin-text-muted">تسجيلات المسوّقين — اليوم وآخر 30 يوم</p>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {(
          [
            { key: 'today' as const, label: 'اليوم' },
            { key: 'all' as const, label: 'الكل' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setTab(opt.key)}
            className={`px-3 min-h-[44px] rounded-lg text-xs font-bold transition-colors ${
              tab === opt.key
                ? 'bg-admin-accent text-admin-bg'
                : 'bg-admin-bg text-admin-text-muted hover:text-admin-text'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="relative mb-3">
        <Search
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-text-muted pointer-events-none"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setVisible(PAGE_SIZE);
            setExpandedKey(null);
          }}
          placeholder="ابحث باسم أو رقم المسوّق / المشتري"
          dir="rtl"
          className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-sm text-admin-text placeholder:text-admin-text-muted"
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-admin-text-muted py-2">
          {search
            ? 'مفيش نتائج للبحث ده'
            : tab === 'today'
              ? 'لسه مفيش مشترين النهاردة'
              : 'مفيش تسجيلات في آخر 30 يوم'}
        </p>
      ) : (
        <ul className="space-y-2">
          {shown.map((group) => {
            const open = expandedKey === group.key;
            return (
              <li
                key={group.key}
                className="rounded-xl bg-admin-bg/60 border border-admin-border overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpandedKey(open ? null : group.key)}
                  className="w-full flex items-center gap-3 px-3 py-3 text-right min-h-[48px] hover:bg-admin-border/40 transition-colors"
                  aria-expanded={open}
                >
                  <ChevronDown
                    size={18}
                    className={`flex-shrink-0 text-admin-text-muted transition-transform ${
                      open ? 'rotate-180' : ''
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-admin-text truncate">{group.name}</div>
                    {group.phone ? (
                      <div className="text-xs text-admin-accent badge-number mt-0.5" dir="ltr">
                        {group.phone}
                      </div>
                    ) : null}
                  </div>
                  <span className="flex-shrink-0 px-2.5 py-1 rounded-lg bg-admin-card border border-admin-border text-xs font-bold text-admin-text">
                    {group.leads.length} مشتري
                  </span>
                </button>

                {open && (
                  <ul className="border-t border-admin-border divide-y divide-admin-border">
                    {group.leads.map((lead) => (
                      <li key={lead.id} className="px-3 py-3 space-y-1.5 bg-admin-card/40">
                        <div className="text-sm text-admin-text">
                          <span className="text-admin-text-muted">اسم المشتري: </span>
                          <span className="font-bold">{lead.name || '—'}</span>
                        </div>
                        <div className="text-sm text-admin-text">
                          <span className="text-admin-text-muted">رقم المشتري: </span>
                          <span className="badge-number font-bold text-admin-accent" dir="ltr">
                            {lead.phone || '—'}
                          </span>
                        </div>
                        {lead.description ? (
                          <div className="text-sm text-admin-text">
                            <span className="text-admin-text-muted">الوصف: </span>
                            <span>{lead.description}</span>
                          </div>
                        ) : null}
                        <div className="pt-1 text-xs text-admin-text-muted">
                          التاريخ: {formatLeadDateTime(lead)}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setVisible((n) => n + PAGE_SIZE)}
          className="mt-3 w-full py-3 min-h-[44px] rounded-xl bg-admin-bg hover:bg-admin-border text-sm font-bold text-admin-text transition-colors"
        >
          عرض المزيد
        </button>
      )}
    </div>
  );
}
