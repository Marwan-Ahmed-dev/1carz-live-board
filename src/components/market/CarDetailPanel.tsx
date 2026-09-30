'use client';

// Split-view detail panel لـ /market.
// بيفتح لما اليوزر يدوس على صف في الـ results table.
// بيعرض:
//   1) Header: brand + model + year + trim + close
//   2) Market Price Analysis — split بين Used و Zero side-by-side.
//   3) Price Trend (Last 6 Months) — SVG line chart (no library, with empty states)
//      الـ chart بيعرض used line (default) و zero line (لو فيه بيانات زيرو).
//   ❌ Suggested Price Range — متشال بناء على طلب اليوزر.
//   ❌ Mileage vs Price — متشال بناء على طلب اليوزر.

import { useMemo } from 'react';
import { X, BarChart3, LineChart as LineChartIcon } from 'lucide-react';
import type { MarketEntry } from '@/lib/types';
import { formatThousands } from '@/lib/format';

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
  // Split into used vs zero — بناءً على is_zero. الـ entries القديمة (بدون
  // الـ field) بتتعامل كـ used (default false).
  const usedEntries = useMemo(
    () => matchingEntries.filter((e) => !e.is_zero),
    [matchingEntries]
  );
  const zeroEntries = useMemo(
    () => matchingEntries.filter((e) => e.is_zero === true),
    [matchingEntries]
  );

  // Aggregations per group
  const usedStats = useMemo(() => buildStats(usedEntries), [usedEntries]);
  const zeroStats = useMemo(() => buildStats(zeroEntries), [zeroEntries]);

  // Price trend — used line (primary) + zero line (overlay لو فيه بيانات).
  const usedTrend = useMemo(() => buildTrend(usedEntries, 6), [usedEntries]);
  const zeroTrend = useMemo(() => buildTrend(zeroEntries, 6), [zeroEntries]);
  const trendValidCount = useMemo(
    () =>
      usedTrend.reduce(
        (n, d, i) => (d.value !== null || zeroTrend[i]?.value !== null ? n + 1 : n),
        0
      ),
    [usedTrend, zeroTrend]
  );

  return (
    <aside
      className="bg-bg-card border border-border-soft rounded-2xl shadow-medium overflow-hidden flex flex-col"
      aria-label="تفاصيل السيارة"
    >
      {/* Header */}
      <div className="px-4 sm:px-5 py-4 border-b border-border-soft flex items-start justify-between gap-3 bg-bg-primary/40">
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
          // Touch target ≥ 44px على الموبايل (w-11 h-11) وباقي الـ breakpoints w-9 h-9.
          className="w-11 h-11 md:w-9 md:h-11 rounded-lg bg-bg-card hover:bg-bg-card-hover border border-border-soft flex items-center justify-center flex-shrink-0"
          aria-label="إغلاق"
        >
          <X size={18} className="text-text-secondary" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
        {/* Market Price Analysis — side-by-side: used vs zero. */}
        <Card
          icon={<BarChart3 size={16} className="text-accent-yellow-hover" />}
          title="Market Price Analysis"
        >
          {usedStats === null && zeroStats === null ? (
            <p className="text-sm text-text-muted">لا توجد بيانات كافية.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <GroupBlock
                title="مستعملة"
                accent="text-text-primary"
                stats={usedStats}
                avgMileageLabel={computeAvgMileage(usedEntries)}
              />
              <GroupBlock
                title="زيرو"
                accent="text-accent-yellow-hover"
                stats={zeroStats}
                avgMileageLabel={
                  zeroEntries.length > 0 ? 'صفر كيلومتر (زيرو)' : undefined
                }
              />
            </div>
          )}
        </Card>

        {/* Price Trend — used (yellow) + zero (slate) lines على نفس الـ chart. */}
        <Card
          icon={<LineChartIcon size={16} className="text-accent-yellow-hover" />}
          title="Price Trend (Last 6 Months)"
        >
          <PriceTrendSVG
            used={usedTrend}
            zero={zeroTrend}
            validBucketCount={trendValidCount}
            totalMatching={matchingEntries.length}
          />
          {/* Legend */}
          <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-accent-yellow rounded-full" />
              مستعملة
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 rounded-full"
                style={{ backgroundColor: '#64748B' }}
              />
              زيرو
            </span>
          </div>
        </Card>
      </div>
    </aside>
  );
}

// ============================================================================
// sub-components
// ============================================================================

interface StatsBucket {
  min: number;
  max: number;
  avg: number;
  count: number;
  totalListings: number;
}

function buildStats(entries: MarketEntry[]): StatsBucket | null {
  if (entries.length === 0) return null;
  const prices = entries
    .map((e) => e.price_egp)
    .filter((p) => Number.isFinite(p) && p > 0);
  if (prices.length === 0) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((s, p) => s + p, 0) / prices.length;
  return {
    min,
    max,
    avg,
    count: entries.length,
    totalListings: prices.length,
  };
}

function computeAvgMileage(entries: MarketEntry[]): string | undefined {
  const vals = entries
    .map((e) => e.mileage_km)
    .filter((m) => Number.isFinite(m) && m >= 0);
  if (vals.length === 0) return undefined;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  return `${formatThousands(Math.round(avg))} كم (متوسط)`;
}

function GroupBlock({
  title,
  accent,
  stats,
  avgMileageLabel,
}: {
  title: string;
  accent: string;
  stats: StatsBucket | null;
  avgMileageLabel?: string;
}) {
  if (!stats) {
    return (
      <div className="bg-bg-card border border-border-soft rounded-xl p-3">
        <div className={`text-xs font-bold uppercase tracking-wide mb-1 ${accent}`}>
          {title}
        </div>
        <p className="text-sm text-text-muted">لا توجد بيانات.</p>
      </div>
    );
  }
  return (
    <div className="bg-bg-card border border-border-soft rounded-xl p-3 space-y-2">
      <div className={`text-xs font-bold uppercase tracking-wide ${accent}`}>{title}</div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Min" value={`${formatThousands(Math.round(stats.min))}`} emphasis />
        <Stat label="Avg" value={`${formatThousands(Math.round(stats.avg))}`} emphasis />
        <Stat label="Max" value={`${formatThousands(Math.round(stats.max))}`} emphasis />
      </div>
      <div className="pt-2 border-t border-border-soft space-y-1">
        <Stat
          label="Listings"
          value={`${formatThousands(stats.count)} ${stats.count === 1 ? 'سيارة' : 'سيارات'}`}
          muted
        />
        {avgMileageLabel && <Stat label="Mileage" value={avgMileageLabel} muted />}
      </div>
    </div>
  );
}

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
// Price trend — simple SVG line chart (no library) مع used + zero overlay.
// X-axis: months (last 6, Arabic labels).
// Y-axis: average price per month (formatted).
// ============================================================================

interface TrendBucket {
  label: string;
  value: number | null;
}

function PriceTrendSVG({
  used,
  zero,
  validBucketCount,
  totalMatching,
}: {
  used: TrendBucket[];
  zero: TrendBucket[];
  /** عدد الـ buckets اللي فيها بيانات فعلاً (مش null) عبر الـ lines. */
  validBucketCount: number;
  /** إجمالي عدد الـ entries المتطابقة — للـ empty state المخصّص. */
  totalMatching: number;
}) {
  // Empty states — واضحة ومحددة.
  if (validBucketCount === 0) {
    return (
      <p className="text-sm text-text-muted">
        لا توجد بيانات للـ 6 شهور الأخيرة.
      </p>
    );
  }
  if (totalMatching <= 1) {
    return (
      <p className="text-sm text-text-muted">
        أضف entries إضافية لرؤية اتجاه الأسعار
      </p>
    );
  }
  const data = used; // X-axis labels come from used (same length as zero).
  const usedValidCount = used.reduce((n, d) => (d.value !== null ? n + 1 : n), 0);
  const zeroValidCount = zero.reduce((n, d) => (d.value !== null ? n + 1 : n), 0);
  if (usedValidCount + zeroValidCount <= 1) {
    return (
      <p className="text-sm text-text-muted">
        لا توجد بيانات كافية لرسم اتجاه الأسعار — أضف المزيد من الـ entries عبر أشهر مختلفة.
      </p>
    );
  }

  // Combine both series for Y scaling (used + zero share the same Y range so
  // they're visually comparable).
  const allValues: number[] = [];
  [...used, ...zero].forEach((d) => {
    if (d.value !== null) allValues.push(d.value);
  });
  if (allValues.length === 0) {
    return (
      <p className="text-sm text-text-muted">لا توجد بيانات كافية.</p>
    );
  }
  const yMin = Math.min(...allValues);
  const yMax = Math.max(...allValues);
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

  // Y-axis ticks: 3 levels (min, mid, max)
  const ticks = [yMax, (yMax + yMin) / 2, yMin];

  // Build the SVG path for a single series (skip nulls).
  function buildPath(series: TrendBucket[]): string {
    const segments: string[] = [];
    series.forEach((d, i) => {
      if (d.value === null) return;
      const x = xFor(i);
      const y = yFor(d.value);
      if (segments.length === 0) {
        segments.push(`M ${x} ${y}`);
      } else {
        const prevValid = series.slice(0, i).reverse().find((p) => p.value !== null);
        if (prevValid) {
          segments.push(`L ${x} ${y}`);
        } else {
          segments.push(`M ${x} ${y}`);
        }
      }
    });
    return segments.join(' ');
  }
  const usedPath = buildPath(used);
  const zeroPath = buildPath(zero);

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

        {/* zero line (drawn first so used line is on top) */}
        {zeroPath && (
          <path
            d={zeroPath}
            fill="none"
            stroke="#64748B"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 3"
          />
        )}

        {/* used line (yellow, solid) */}
        {usedPath && (
          <path
            d={usedPath}
            fill="none"
            stroke="#FCD34D"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* used dots + month labels */}
        {used.map((d, i) => {
          if (d.value === null) return null;
          const x = xFor(i);
          const y = yFor(d.value);
          return (
            <g key={`used-pt-${i}`}>
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

        {/* zero dots */}
        {zero.map((d, i) => {
          if (d.value === null) return null;
          const x = xFor(i);
          const y = yFor(d.value);
          return (
            <circle
              key={`zero-pt-${i}`}
              cx={x}
              cy={y}
              r={3}
              fill="#64748B"
              stroke="#1A1A1A"
              strokeWidth={1}
            />
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