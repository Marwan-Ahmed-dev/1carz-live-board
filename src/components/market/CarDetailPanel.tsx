'use client';

// Split-view detail panel لـ /market.
// بيفتح لما اليوزر يدوس على صف في الـ results table.
// بيعرض:
//   1) Header: brand + model + year + trim + close
//   2) Market Price Analysis: min/avg/max + total listings
//   3) Suggested Price Range
//   4) Price Trend (Last 6 Months) — SVG line chart (no library)
//   ❌ Mileage vs Price — متشال بناء على طلب اليوزر.

import { useMemo } from 'react';
import { X, TrendingUp, BarChart3, LineChart as LineChartIcon, Sparkles } from 'lucide-react';
import type { MarketEntry } from '@/lib/types';

interface CarDetailPanelProps {
  brand: string;
  model: string;
  year: number;
  trim: string;
  /** All matching entries (used for aggregations + chart). */
  matchingEntries: MarketEntry[];
  onClose: () => void;
}

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

export function CarDetailPanel({
  brand,
  model,
  year,
  trim,
  matchingEntries,
  onClose,
}: CarDetailPanelProps) {
  // Aggregations
  const stats = useMemo(() => {
    if (matchingEntries.length === 0) {
      return null;
    }
    const prices = matchingEntries.map((e) => e.price_egp).filter((p) => Number.isFinite(p) && p > 0);
    if (prices.length === 0) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
    return { min, avg, max, count: matchingEntries.length, totalListings: prices.length };
  }, [matchingEntries]);

  // Suggested range — استخدام ±10% من المتوسط
  const suggested = useMemo(() => {
    if (!stats) return null;
    const low = stats.avg * 0.9;
    const high = stats.avg * 1.1;
    return { low, high };
  }, [stats]);

  // Price trend — آخر 6 شهور بناءً على created_at
  const trend = useMemo(() => buildTrend(matchingEntries, 6), [matchingEntries]);

  return (
    <aside
      className="bg-bg-card border border-border-soft rounded-2xl shadow-medium overflow-hidden flex flex-col"
      aria-label="تفاصيل السيارة"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-border-soft flex items-start justify-between gap-3 bg-bg-primary/40">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-text-primary truncate">
            {brand} {model}
          </h2>
          <p className="text-sm text-text-muted mt-0.5 truncate">
            <span dir="ltr">{year}</span> · {trim}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-lg bg-bg-card hover:bg-bg-card-hover border border-border-soft flex items-center justify-center flex-shrink-0"
          aria-label="إغلاق"
        >
          <X size={16} className="text-text-secondary" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-4 overflow-y-auto">
        {/* Market Price Analysis */}
        <Card icon={<BarChart3 size={16} className="text-accent-yellow-hover" />} title="Market Price Analysis">
          {!stats ? (
            <p className="text-sm text-text-muted">لا توجد بيانات كافية.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Min Price" value={formatEGP(stats.min)} emphasis />
                <Stat label="Average" value={formatEGP(stats.avg)} emphasis />
                <Stat label="Max Price" value={formatEGP(stats.max)} emphasis />
              </div>
              <div className="mt-3 pt-3 border-t border-border-soft">
                <Stat label="Total Listings" value={`${stats.count} ${stats.count === 1 ? 'سيارة' : 'سيارات'}`} muted />
              </div>
            </>
          )}
        </Card>

        {/* Suggested Price Range */}
        {suggested && (
          <Card
            icon={<Sparkles size={16} className="text-accent-yellow-hover" />}
            title="Suggested Price Range"
          >
            <p className="text-lg sm:text-xl font-bold text-text-primary badge-number" dir="ltr">
              {formatEGP(suggested.low)} — {formatEGP(suggested.high)} EGP
            </p>
            <p className="text-xs text-text-muted mt-1">
              بناءً على {stats?.count ?? 0} {stats?.count === 1 ? 'سيارة مشابهة' : 'سيارات مشابهة'} في السوق.
            </p>
          </Card>
        )}

        {/* Price Trend */}
        <Card
          icon={<LineChartIcon size={16} className="text-accent-yellow-hover" />}
          title="Price Trend (Last 6 Months)"
        >
          <PriceTrendSVG data={trend} />
        </Card>
      </div>
    </aside>
  );
}

// ============================================================================
// sub-components
// ============================================================================

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-bg-primary border border-border-soft rounded-xl p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-text-primary mb-3">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  emphasis,
  muted,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wide">{label}</div>
      <div
        className={`mt-0.5 text-sm font-bold ${
          emphasis ? 'text-text-primary' : muted ? 'text-text-secondary' : 'text-text-primary'
        }`}
        dir={emphasis ? 'ltr' : undefined}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// Price trend — simple SVG line chart (no library).
// X-axis: months (last 6, Arabic labels).
// Y-axis: average price per month (formatted).
// ============================================================================

interface TrendBucket {
  label: string;
  value: number | null;
}

function PriceTrendSVG({ data }: { data: TrendBucket[] }) {
  // Filter out null buckets for chart geometry (still show the label)
  const validValues = data.map((d) => d.value).filter((v): v is number => v !== null);
  if (validValues.length === 0) {
    return <p className="text-sm text-text-muted">لا توجد بيانات للـ 6 شهور الأخيرة.</p>;
  }
  const yMin = Math.min(...validValues);
  const yMax = Math.max(...validValues);
  const yPad = Math.max((yMax - yMin) * 0.1, 1);

  const width = 320;
  const height = 140;
  const paddingX = 28;
  const paddingY = 18;

  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  const step = innerW / Math.max(data.length - 1, 1);

  const xFor = (i: number) => paddingX + i * step;
  const yFor = (v: number) => {
    const span = yMax - yMin + yPad * 2;
    const ratio = (v - (yMin - yPad)) / span;
    return paddingY + (1 - ratio) * innerH;
  };

  // Path: connect valid points, skip nulls (render dots only)
  const segments: string[] = [];
  data.forEach((d, i) => {
    if (d.value === null) return;
    const x = xFor(i);
    const y = yFor(d.value);
    if (segments.length === 0) {
      segments.push(`M ${x} ${y}`);
    } else {
      // Only connect if previous valid point exists within consecutive run
      const prevValid = data.slice(0, i).reverse().find((p) => p.value !== null);
      if (prevValid) {
        segments.push(`L ${x} ${y}`);
      } else {
        segments.push(`M ${x} ${y}`);
      }
    }
  });
  const path = segments.join(' ');

  // Y-axis ticks: 3 levels (min, mid, max)
  const ticks = [yMax, (yMax + yMin) / 2, yMin];

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        role="img"
        aria-label="اتجاه السعر خلال آخر 6 شهور"
      >
        {/* horizontal grid lines */}
        {ticks.map((t, i) => {
          const y = yFor(t);
          return (
            <line
              key={`grid-${i}`}
              x1={paddingX}
              x2={width - paddingX}
              y1={y}
              y2={y}
              stroke="#E5E7EB"
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          );
        })}

        {/* y-axis tick labels */}
        {ticks.map((t, i) => {
          const y = yFor(t);
          return (
            <text
              key={`tick-${i}`}
              x={paddingX - 4}
              y={y + 3}
              textAnchor="end"
              fontSize={9}
              fill="#6B7280"
              fontFamily="var(--font-inter), sans-serif"
              fontWeight={700}
            >
              {shortNumber(t)}
            </text>
          );
        })}

        {/* line */}
        {path && (
          <path
            d={path}
            fill="none"
            stroke="#FCD34D"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* dots + labels */}
        {data.map((d, i) => {
          if (d.value === null) return null;
          const x = xFor(i);
          const y = yFor(d.value);
          return (
            <g key={`pt-${i}`}>
              <circle cx={x} cy={y} r={4} fill="#FCD34D" stroke="#1A1A1A" strokeWidth={1.5} />
              <text
                x={x}
                y={height - 4}
                textAnchor="middle"
                fontSize={10}
                fill="#4B5563"
                fontWeight={700}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function shortNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

function formatEGP(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 }).format(value);
}

// ============================================================================
// helpers
// ============================================================================

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

/**
 * تجميع الـ entries في شهور (آخر N شهر) وحساب متوسط السعر لكل شهر.
 * لو مفيش entries في شهر معيّن → null عشان نسيب gap في الـ chart.
 */
function buildTrend(entries: MarketEntry[], monthCount: number): TrendBucket[] {
  const now = new Date();
  const buckets: TrendBucket[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = ARABIC_MONTHS[d.getMonth()];
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
    const inMonth = entries.filter((e) => {
      const ms = tsMs(e.created_at);
      return ms >= monthStart && ms < monthEnd;
    });
    const prices = inMonth.map((e) => e.price_egp).filter((p) => Number.isFinite(p) && p > 0);
    const avg = prices.length > 0 ? prices.reduce((s, p) => s + p, 0) / prices.length : null;
    buckets.push({ label, value: avg });
  }
  return buckets;
}