'use client';

// جدول النتائج في /market.
// - Header: "Search Results" + badge بالعدد + Sort dropdown.
// - Body: جدول (#, Brand, Model, Year, Trim, Mileage, Price, Paint, Date).
// - Footer: "Showing X to Y of Z" + Pagination.

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowDownUp } from 'lucide-react';
import type { MarketEntry } from '@/lib/types';

type SortKey = 'newest' | 'oldest' | 'price_desc' | 'price_asc' | 'year_desc';

const PAGE_SIZE = 10;

interface MarketResultsTableProps {
  entries: MarketEntry[];
  loading: boolean;
}

export function MarketResultsTable({ entries, loading }: MarketResultsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [page, setPage] = useState<number>(1);

  const sorted = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      switch (sortKey) {
        case 'newest':
          return tsMs(b.created_at) - tsMs(a.created_at);
        case 'oldest':
          return tsMs(a.created_at) - tsMs(b.created_at);
        case 'price_desc':
          return b.price_egp - a.price_egp;
        case 'price_asc':
          return a.price_egp - b.price_egp;
        case 'year_desc':
          return b.year - a.year;
      }
    });
    return copy;
  }, [entries, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = sorted.slice(start, start + PAGE_SIZE);
  const from = sorted.length === 0 ? 0 : start + 1;
  const to = Math.min(sorted.length, start + PAGE_SIZE);

  const handleSortChange = (v: SortKey) => {
    setSortKey(v);
    setPage(1);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200">
        <div className="flex items-center gap-3 min-w-0">
          <h3 className="text-base font-bold text-slate-900">Search Results</h3>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
            {entries.length} {entries.length === 1 ? 'result' : 'results'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ArrowDownUp size={14} className="text-slate-500 hidden sm:block" />
          <select
            value={sortKey}
            onChange={(e) => handleSortChange(e.target.value as SortKey)}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="newest">Sort by: Newest</option>
            <option value="oldest">Sort by: Oldest</option>
            <option value="price_desc">Sort by: Price (High → Low)</option>
            <option value="price_asc">Sort by: Price (Low → High)</option>
            <option value="year_desc">Sort by: Year (Newest)</option>
          </select>
        </div>
      </div>

      {/* Body */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="px-5 py-12 text-center text-slate-500 text-sm">جاري التحميل...</div>
        ) : sorted.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-500 text-sm">
            لا توجد نتائج — جرّب تعديل الفلاتر أو أضف entry جديد.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-center px-3 py-3 w-12">#</th>
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-right px-3 py-3">Brand</th>
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-right px-3 py-3">Model</th>
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-right px-3 py-3">Year</th>
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-right px-3 py-3">Trim</th>
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-right px-3 py-3">Mileage (KM)</th>
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-right px-3 py-3">Price (EGP)</th>
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-right px-3 py-3">Paint / Condition</th>
                <th className="text-xs uppercase tracking-wide font-medium text-slate-500 text-right px-3 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-3 py-3 text-slate-500 text-center font-medium">
                    {from + idx}
                  </td>
                  <td className="px-3 py-3 text-slate-900 font-semibold">{entry.brand}</td>
                  <td className="px-3 py-3 text-slate-700">{entry.model}</td>
                  <td className="px-3 py-3 text-slate-700" dir="ltr">{entry.year}</td>
                  <td className="px-3 py-3 text-slate-700">{entry.trim}</td>
                  <td className="px-3 py-3 text-slate-700" dir="ltr">{entry.mileage_km.toLocaleString('en-US')}</td>
                  <td className="px-3 py-3 text-slate-900 font-semibold" dir="ltr">
                    {entry.price_egp.toLocaleString('en-US')} EGP
                  </td>
                  <td className="px-3 py-3 text-slate-700 max-w-[200px] truncate" title={entry.paint_condition}>
                    {entry.paint_condition || '—'}
                  </td>
                  <td className="px-3 py-3 text-slate-500 text-xs whitespace-nowrap">
                    {formatDate(entry.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-200 text-sm">
          <span className="text-slate-500">
            Showing <span className="font-semibold text-slate-900">{from}</span> to{' '}
            <span className="font-semibold text-slate-900">{to}</span> of{' '}
            <span className="font-semibold text-slate-900">{sorted.length}</span> results
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="السابق"
            >
              <ChevronRight size={16} />
            </button>
            <PageNumbers page={safePage} total={totalPages} onChange={setPage} />
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="التالي"
            >
              <ChevronLeft size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function PageNumbers({
  page,
  total,
  onChange,
}: {
  page: number;
  total: number;
  onChange: (p: number) => void;
}) {
  const pages = computePageWindow(page, total);
  return (
    <>
      {pages.map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} className="px-2 text-slate-400">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`inline-flex items-center justify-center w-9 h-9 rounded-lg text-sm font-semibold ${
              p === page
                ? 'bg-blue-600 text-white'
                : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
            aria-current={p === page ? 'page' : undefined}
          >
            {p}
          </button>
        )
      )}
    </>
  );
}

function computePageWindow(page: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (page >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', page - 1, page, page + 1, '…', total];
}

function tsMs(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'toDate' in ts) {
    try {
      return (ts as { toDate: () => Date }).toDate().getTime();
    } catch {
      return 0;
    }
  }
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  return 0;
}

function formatDate(ts: unknown): string {
  const ms = tsMs(ts);
  if (!ms) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(ms));
  } catch {
    return '—';
  }
}