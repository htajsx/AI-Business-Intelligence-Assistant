import { useMemo } from 'react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ReferenceArea,
} from 'recharts'
import { formatCurrency, formatInt } from '../../../utils/format'

function formatMonthLabel(val) {
  if (!val || typeof val !== 'string') return ''
  const parts = val.split('-')
  if (parts.length < 2) return val
  const monthIdx = parseInt(parts[1], 10) - 1
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const yr = parts[0].slice(2)
  return `${months[monthIdx] || parts[1]} '${yr}`
}

function formatCompactBrl(val) {
  if (val === 0) return 'R$ 0'
  const compact = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(val)
  return `R$ ${compact}`
}

function CustomTooltip({ active, payload, label, prevMap }) {
  if (!active || !payload || !payload.length) return null
  const data = payload[0].payload
  const prevRev = prevMap?.get(data.month)
  const diffPct =
    prevRev && prevRev > 0
      ? ((data.revenue - prevRev) / prevRev) * 100
      : data.momGrowthPct ?? null

  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95">
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-1.5 dark:border-slate-800">
        <span className="text-xs font-bold text-slate-900 dark:text-white">
          {formatMonthLabel(label)}
        </span>
        {data.isPartial && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            Partial
          </span>
        )}
      </div>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex items-center justify-between gap-4">
          <span className="font-medium text-slate-500 dark:text-slate-400">Net Revenue</span>
          <span className="font-extrabold tabular-nums text-indigo-600 dark:text-indigo-400">
            {formatCurrency(data.revenue)}
          </span>
        </div>
        {data.orders !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-slate-500 dark:text-slate-400">Orders</span>
            <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
              {formatInt(data.orders)}
            </span>
          </div>
        )}
        {data.aov !== undefined && (
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium text-slate-500 dark:text-slate-400">AOV</span>
            <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">
              {formatCurrency(data.aov)}
            </span>
          </div>
        )}
        {diffPct !== null && diffPct !== undefined && Number.isFinite(diffPct) && (
          <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <span className="font-medium text-slate-500 dark:text-slate-400">vs Prev Month</span>
            <span
              className={`font-bold tabular-nums ${
                diffPct > 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : diffPct < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-500'
              }`}
            >
              {diffPct > 0 ? '+' : ''}
              {diffPct.toFixed(1)}%
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

function PeakMarker({ cx, cy, label }) {
  if (!cx || !cy) return null
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill="#590907" stroke="#ffffff" strokeWidth={2} />
      <foreignObject x={cx - 70} y={cy - 34} width={140} height={28}>
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-indigo-200 bg-white/95 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 shadow-md backdrop-blur-sm whitespace-nowrap dark:border-indigo-800 dark:bg-slate-900/95 dark:text-indigo-300">
            {label}
          </span>
        </div>
      </foreignObject>
    </g>
  )
}

export default function TrendAreaChart({
  rows = [],
  scope = {},
  granularity = 'Month',
}) {
  const { series, peakRow, peakLabel, quarterlyTicks, prevMap, partialStart, partialEnd } =
    useMemo(() => {
      const s = Array.isArray(rows) ? rows : []
      if (s.length === 0) {
        return {
          series: [],
          peakRow: null,
          peakLabel: '',
          quarterlyTicks: [],
          prevMap: new Map(),
          partialStart: null,
          partialEnd: null,
        }
      }

      let maxRow = s[0]
      const pMap = new Map()
      let pStart = null
      let pEnd = null

      for (let i = 0; i < s.length; i++) {
        const item = s[i]
        if ((item.revenue || 0) > (maxRow.revenue || 0)) {
          maxRow = item
        }
        if (i > 0) {
          pMap.set(item.month, s[i - 1].revenue)
        }
        if (item.isPartial) {
          if (!pStart) pStart = item.month
          pEnd = item.month
        }
      }

      const pLabel = maxRow
        ? `Peak · ${formatMonthLabel(maxRow.month)} · ${formatCompactBrl(maxRow.revenue)}`
        : ''

      const quarters = s
        .map((r) => r.month)
        .filter((m) => {
          const parts = String(m).split('-')
          return parts.length >= 2 && ['01', '04', '07', '10'].includes(parts[1])
        })

      const ticks = quarters.length >= 3 ? quarters : s.filter((_, i) => i % 3 === 0).map((r) => r.month)

      return {
        series: s,
        peakRow: maxRow,
        peakLabel: pLabel,
        quarterlyTicks: ticks,
        prevMap: pMap,
        partialStart: pStart,
        partialEnd: pEnd,
      }
    }, [rows])

  const maxRevenue = useMemo(() => {
    if (!series.length) return 100000
    const m = Math.max(...series.map((r) => r.revenue || 0))
    return m * 1.15
  }, [series])

  return (
    <div className="flex flex-col">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div>
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
            Net Sales Progression
          </h3>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            Delivered revenue in BRL (R$) · {granularity} cadence
          </p>
        </div>
        {scope.isPartialPeriod && (
          <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
            Includes partial trailing window
          </span>
        )}
      </div>

      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={series} margin={{ top: 20, right: 16, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#590907" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#590907" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#A5A79B"
              strokeOpacity={0.25}
            />

            <XAxis
              dataKey="month"
              ticks={quarterlyTicks}
              tickFormatter={formatMonthLabel}
              tick={{ fontSize: 11, fill: '#85877B' }}
              tickMargin={10}
              axisLine={false}
              tickLine={false}
            />

            <YAxis
              width={64}
              domain={[0, maxRevenue]}
              tickCount={5}
              tickFormatter={formatCompactBrl}
              tick={{ fontSize: 11, fill: '#85877B' }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              content={<CustomTooltip prevMap={prevMap} />}
              cursor={{ stroke: '#590907', strokeWidth: 1, strokeDasharray: '4 4' }}
            />

            {partialStart && partialEnd && (
              <ReferenceArea
                x1={partialStart}
                x2={partialEnd}
                fill="#B7832A"
                fillOpacity={0.08}
              />
            )}

            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#590907"
              strokeWidth={2.5}
              fill="url(#trendAreaGrad)"
              isAnimationActive={false}
            />

            {peakRow && (
              <ReferenceDot
                x={peakRow.month}
                y={peakRow.revenue}
                shape={<PeakMarker label={peakLabel} />}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
