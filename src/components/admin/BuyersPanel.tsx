'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { BuyerLead } from '@/lib/types';
import {
  subscribeToLast30DaysBuyerLeads,
  subscribeToTodaysBuyerLeads,
} from '@/lib/buyers';
import { digitsOnly } from '@/lib/phone';
import { toJsDate } from '@/lib/cairoDay';

const PAGE_SIZE = 10;

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

export function BuyersPanel() {
  const [tab, setTab] = useState<'today' | 'all'>('today');
  const [todayLeads, setTodayLeads] = useState<BuyerLead[]>([]);
  const [allLeads, setAllLeads] = useState<BuyerLead[]>([]);
  const [search, setSearch] = useState('');
  const [visible, setVisible] = useState(PAGE_SIZE);

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
  }, [tab]);

  const source = tab === 'today' ? todayLeads : allLeads;

  const filtered = useMemo(() => {
    const q = digitsOnly(search);
    if (!q) return source;
    return source.filter((lead) => {
      const buyerPhone = digitsOnly(lead.phone);
      const marketerPhone = digitsOnly(lead.marketer_phone || '');
      return buyerPhone.includes(q) || marketerPhone.includes(q);
    });
  }, [source, search]);

  const shown = filtered.slice(0, visible);
  const hasMore = filtered.length > visible;

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
          }}
          placeholder="ابحث برقم المشتري أو المسوّق"
          dir="ltr"
          className="w-full pr-9 pl-3 py-2.5 rounded-xl bg-admin-bg border border-admin-border text-sm text-admin-text placeholder:text-admin-text-muted"
        />
      </div>

      {shown.length === 0 ? (
        <p className="text-sm text-admin-text-muted py-2">
          {search ? 'مفيش نتائج للرقم ده' : tab === 'today' ? 'لسه مفيش مشترين النهاردة' : 'مفيش تسجيلات في آخر 30 يوم'}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((lead) => (
            <li
              key={lead.id}
              className="rounded-xl bg-admin-bg/60 border border-admin-border px-3 py-3 space-y-2"
            >
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
              <div className="text-base text-admin-text">
                <span className="text-admin-text-muted text-sm">اسم المسوّق: </span>
                <span className="font-bold">{lead.marketer_name || '—'}</span>
              </div>
              <div className="text-sm text-admin-text">
                <span className="text-admin-text-muted">رقم المسوّق: </span>
                <span className="badge-number font-bold text-admin-accent" dir="ltr">
                  {lead.marketer_phone || '—'}
                </span>
              </div>
              <div className="pt-1 border-t border-admin-border text-sm font-medium text-admin-text">
                <span className="text-admin-text-muted text-xs">التاريخ: </span>
                {formatLeadDateTime(lead)}
              </div>
            </li>
          ))}
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
