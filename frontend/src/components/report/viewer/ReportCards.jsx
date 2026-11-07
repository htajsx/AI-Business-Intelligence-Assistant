import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Receipt,
  Truck,
  XCircle,
  Star,
  Repeat,
  BarChart2,
  Clock,
} from 'lucide-react'
import { formatValue } from '../../../utils/format'

export const statusTone = (status) => {
  const s = String(status || '').toLowerCase()
  if (
    [
      'optimal',
      'sla met',
      'controlled',
      'verified',
      'satisfactory',
      'met',
      'reconciled',
    ].includes(s)
  ) {
    return 'good'
  }
  if (
    [
      'warning',
      'breached',
      'attention',
      'high risk',
      'elevated',
      'minor variance',
    ].includes(s)
  ) {
    return 'warn'
  }
  if (
    ['bad', 'critical', 'failed', 'mismatch', 'breach', 'action required'].includes(
      s,
    )
  ) {
    return 'bad'
  }
  return 'info'
}

const innerBorder = 'border-slate-200 dark:border-[#2F2A24]'

const PILL = {
  good: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-400/20',
  warn: 'bg-amber-50 text-amber-700 ring-amber-200/70 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-400/20',
  bad: 'bg-rose-50 text-rose-700 ring-rose-200/70 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-400/20',
  info: 'bg-indigo-50 text-indigo-700 ring-indigo-200/70 dark:bg-indigo-500/15 dark:text-indigo-300 dark:ring-indigo-400/20',
}

const BAR = {
  good: 'bg-emerald-500 dark:bg-emerald-400',
  warn: 'bg-amber-500 dark:bg-amber-400',
  bad: 'bg-rose-500 dark:bg-rose-400',
  info: 'bg-indigo-500 dark:bg-indigo-400',
}

const ACCENT = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-rose-500',
  info: 'bg-indigo-500',
}

function renderKpiIcon(key = '', label = '') {
  const s = `${key} ${label}`.toLowerCase()
  let Icon = BarChart2
  if (/revenue|sales|gmv|val/.test(s)) Icon = DollarSign
  else if (/order|volume/.test(s)) Icon = ShoppingBag
  else if (/aov|basket|ticket/.test(s)) Icon = Receipt
  else if (/delivery|transit|lead|sla|on-time|ontime/.test(s)) Icon = Truck
  else if (/cancel/.test(s)) Icon = XCircle
  else if (/score|review|rating|csat|nps/.test(s)) Icon = Star
  else if (/repeat|retention|churn/.test(s)) Icon = Repeat

  return <Icon size={15} aria-hidden="true" />
}

function renderOpIcon(name = '', unit = '') {
  const s = `${name} ${unit}`.toLowerCase()
  let Icon = BarChart2
  if (/sla|on-time|ontime|transit|delivery/.test(s)) Icon = Truck
  else if (/review|score|rating|nps|csat/.test(s)) Icon = Star
  else if (/cancel/.test(s)) Icon = XCircle
  else if (/time|latency|lead|duration|days/.test(s)) Icon = Clock

  return <Icon size={15} aria-hidden="true" />
}

function formatKpi(value, fmt) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A'
  const n = Number(value)
  if (fmt === 'currency') {
    const abs = Math.abs(n)
    if (abs >= 1e9) return `R$ ${(n / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `R$ ${(n / 1e6).toFixed(2)}M`
    if (abs >= 1e5) return `R$ ${(n / 1e3).toFixed(1)}K`
  }
  return formatValue(value, fmt)
}

export function StatusPill({ status }) {
  if (!status) return null
  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap ring-1 ring-inset ${PILL[statusTone(status)]}`}
    >
      {status}
    </span>
  )
}

export function DeltaBadge({ deltaPct, direction = 'higher_is_better' }) {
  if (deltaPct === null || deltaPct === undefined) return null
  const isNeutral = deltaPct === 0
  const isGood = direction === 'lower_is_better' ? deltaPct < 0 : deltaPct > 0
  const Icon = deltaPct > 0 ? TrendingUp : deltaPct < 0 ? TrendingDown : null

  return (
    <span
      className={`inline-flex h-5 shrink-0 items-center gap-1 rounded-full px-2 text-[11px] font-bold tabular-nums whitespace-nowrap ${
        isNeutral
          ? 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300'
          : isGood
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
      }`}
    >
      {Icon && <Icon size={12} className="stroke-[2.5]" aria-hidden="true" />}
      {deltaPct > 0 ? '+' : ''}
      {deltaPct.toFixed(1)}%
    </span>
  )
}

export function KpiCard({ kpi, comparisonAvailable }) {
  const fmt =
    kpi.unit === 'BRL'
      ? 'currency'
      : kpi.unit === '%'
        ? (kpi.key === 'onTimeRate' || kpi.key === 'on_time' ? 'percent_2' : 'percent')
        : kpi.unit === 'days'
          ? 'days'
          : kpi.unit === 'score'
            ? 'score'
            : 'number'

  const hasDelta = comparisonAvailable && kpi.deltaPct !== null && kpi.deltaPct !== undefined
  const hasBenchmark = kpi.benchmarkValue !== null && kpi.benchmarkValue !== undefined
  const tone = kpi.status ? statusTone(kpi.status) : null

  return (
    <div
      className={`relative flex min-h-[175px] h-full flex-col overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-xs transition-shadow hover:shadow-md dark:bg-[#1B1814] ${innerBorder}`}
    >
      {tone && (
        <span
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 h-0.5 ${ACCENT[tone]}`}
        />
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
          {renderKpiIcon(kpi.key, kpi.label)}
        </div>
        {kpi.status && <StatusPill status={kpi.status} />}
      </div>

      <p
        title={kpi.label}
        className="mt-2.5 truncate text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {kpi.label}
      </p>

      <p
        title={formatValue(kpi.value, fmt)}
        className="mt-1 truncate text-2xl font-extrabold tracking-tight tabular-nums text-slate-950 dark:text-white"
      >
        {formatKpi(kpi.value, fmt)}
      </p>

      <div className="mt-auto pt-3">
        <div className={`flex min-h-[38px] items-center border-t pt-2 ${innerBorder}`}>
          {hasDelta ? (
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
              <DeltaBadge deltaPct={kpi.deltaPct} direction={kpi.direction} />
              {kpi.previousValue !== null && kpi.previousValue !== undefined && (
                <span
                  title={`vs ${formatValue(kpi.previousValue, fmt)}`}
                  className="min-w-0 truncate text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400"
                >
                  vs {formatKpi(kpi.previousValue, fmt)}
                </span>
              )}
            </div>
          ) : hasBenchmark ? (
            <p className="w-full truncate text-[11.5px] font-semibold text-slate-600 dark:text-slate-400">
              {kpi.benchmarkLabel || 'Benchmark'}:{' '}
              <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                {formatKpi(kpi.benchmarkValue, fmt)}
              </span>
            </p>
          ) : (
            <p
              title={kpi.subtitle}
              className="line-clamp-2 text-[11px] font-semibold leading-snug text-slate-500 dark:text-slate-400"
            >
              {kpi.subtitle || 'Evaluated metric benchmark'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function formatOp(op, v) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return 'N/A'
  const n = Number(v)
  if (op.unit === '%' && /on-time|ontime|sla/i.test(op.name || '')) return `${n.toFixed(2)}%`
  if (op.unit === '%') return `${n.toFixed(1)}%`
  if (op.unit === 'days') return `${n.toFixed(2)} days`
  if (op.unit === 'score') return n.toFixed(2)
  return n.toFixed(1)
}

export function OperationCard({ op }) {
  const tone = statusTone(op.status)
  const lowerBetter =
    op.unit === 'days' || /cancel|transit|lead time|latency/i.test(op.name || '')
  const score = Number(op.score) || 0
  const target = Number(op.target) || 0

  const isPercent = op.unit === '%'
  const max = isPercent
    ? 100
    : Math.max(score, target) * 1.5 || 10

  const fillPct = Math.min(100, Math.max(0, (score / max) * 100))
  const targetPct = Math.min(100, Math.max(0, (target / max) * 100))

  const delta = score - target
  const passed = lowerBetter ? score <= target : score >= target

  const getDeltaText = () => {
    if (isPercent) {
      const diff = Math.abs(delta).toFixed(/on-time|ontime|sla/i.test(op.name || '') ? 2 : 1)
      return delta >= 0 ? `+${diff} pts vs target` : `-${diff} pts vs target`
    }
    if (op.unit === 'days') {
      const diff = Math.abs(delta).toFixed(2)
      return delta <= 0 ? `${diff} days faster than target` : `${diff} days over target`
    }
    if (op.unit === 'score') {
      const diff = Math.abs(delta).toFixed(2)
      return delta >= 0 ? `+${diff} pts above target` : `${diff} pts below target`
    }
    return `${formatOp(op, score)} vs target ${formatOp(op, target)}`
  }

  const deltaText = getDeltaText()

  return (
    <div
      className={`relative flex min-h-[175px] h-full flex-col overflow-hidden rounded-2xl border bg-white/95 p-4 shadow-xs transition-shadow hover:shadow-md dark:bg-[#1B1814] ${innerBorder}`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-x-0 top-0 h-0.5 ${ACCENT[tone]}`}
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
          {renderOpIcon(op.name, op.unit)}
        </div>
        <StatusPill status={op.status} />
      </div>

      <p
        title={op.name}
        className="mt-2.5 truncate text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400"
      >
        {op.name}
      </p>

      <p className="mt-1 truncate text-2xl font-extrabold tracking-tight tabular-nums text-slate-950 dark:text-white">
        {formatOp(op, score)}
      </p>

      <div className="mt-auto pt-3">
        <div className={`border-t pt-2.5 ${innerBorder}`}>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
            <div
              className={`h-full rounded-full ${BAR[tone]}`}
              style={{ width: `${fillPct}%` }}
            />
            <span
              aria-hidden="true"
              className="absolute inset-y-0 w-1 -translate-x-1/2 bg-slate-900 shadow-sm dark:bg-white"
              style={{ left: `${targetPct}%` }}
              title={`Target: ${formatOp(op, target)}`}
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold tabular-nums">
            <span
              className={
                passed
                  ? 'font-bold text-emerald-600 dark:text-emerald-400'
                  : 'font-bold text-rose-600 dark:text-rose-400'
              }
            >
              {deltaText}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              {lowerBetter ? 'Target ≤ ' : 'Target ≥ '}
              {formatOp(op, target)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
