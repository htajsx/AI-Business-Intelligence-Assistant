import { useState, useMemo } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts'
import { compact, formatInt } from '../../../utils/format'
import { useIsDarkMode } from '../../../utils/theme'
import { getGridColor, getTickColor } from '../../charts/shared/chartTheme'

const METRIC_CONFIGS = [
  {
    id: 'revenue',
    label: 'Net Revenue',
    color: '#6B8A4F',
    lightBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    textColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/40 dark:border-emerald-500/50',
    fallbackDelta: null
  },
  {
    id: 'movingAvg3',
    label: '3-period moving average',
    color: '#B7832A',
    lightBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    textColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/40 dark:border-amber-500/50',
    fallbackDelta: null
  }
]

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md dark:border-slate-800/90 dark:bg-slate-900/95">
      <p className="mb-1.5 border-b border-slate-100 pb-1 font-bold text-slate-800 dark:border-slate-800 dark:text-slate-200">
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
              R$ {formatInt(entry.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RevenueTrajectoryChart({ rows: rawRows = [], triggerKey = 1 }) {
  const [hoveredKey, setHoveredKey] = useState(null)
  const [animKey, setAnimKey] = useState(0)
  const isDark = useIsDarkMode()

  const rows = useMemo(
    () =>
      (Array.isArray(rawRows) ? rawRows : []).map((r) => ({
        ...r,
        movingAvg3: r.movingAvg3 ?? r.target ?? null
      })),
    [rawRows]
  )

  const gridStroke = getGridColor(isDark)
  const tickColor = getTickColor(isDark)

  const { fixedYDomain, calculatedMetrics } = useMemo(() => {
    if (!rows || rows.length === 0) {
      return {
        fixedYDomain: [0, 1000000],
        calculatedMetrics: METRIC_CONFIGS.map((m) => ({
          ...m,
          latestValue: 'No data',
          delta: null
        }))
      }
    }

    const allValues = []
    METRIC_CONFIGS.forEach((m) => {
      rows.forEach((r) => {
        const val = r[m.id]
        if (typeof val === 'number' && !isNaN(val)) {
          allValues.push(val)
        }
      })
    })

    const max = allValues.length > 0 ? Math.max(...allValues) : 1000000
    const roundedMax = Math.ceil((max * 1.08) / 100000) * 100000

    const lastIdx = rows.length - 1
    const prevIdx = rows.length - 2

    const metrics = METRIC_CONFIGS.map((m) => {
      const currentVal = lastIdx >= 0 ? rows[lastIdx][m.id] : null
      const prevVal = prevIdx >= 0 ? rows[prevIdx][m.id] : null

      let delta = null
      if (
        typeof currentVal === 'number' &&
        typeof prevVal === 'number' &&
        prevVal > 0
      ) {
        const pct = ((currentVal - prevVal) / prevVal) * 100
        delta = `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
      }

      return {
        ...m,
        latestValue:
          typeof currentVal === 'number'
            ? `R$ ${compact(currentVal)}`
            : 'No data',
        delta
      }
    })

    return {
      fixedYDomain: [0, Math.max(roundedMax, 100000)],
      calculatedMetrics: metrics
    }
  }, [rows])

  const activeLines = useMemo(() => {
    if (!hoveredKey) return METRIC_CONFIGS
    return METRIC_CONFIGS.filter((m) => m.id === hoveredKey)
  }, [hoveredKey])

  const handleCardClick = (id) => {
    setHoveredKey((prev) => (prev === id ? null : id))
    setAnimKey((prev) => prev + 1)
  }

  return (
    <div className="flex h-full w-full flex-col justify-between">
      <div className="mb-4 grid grid-cols-2 gap-3">
        {calculatedMetrics.map((item) => {
          const isSelected = hoveredKey === item.id
          const isDimmed = hoveredKey && !isSelected
          const isCurrentHovered = isSelected || !hoveredKey

          return (
            <div
              key={item.id}
              onClick={() => handleCardClick(item.id)}
              className={`flex cursor-pointer items-center justify-between rounded-xl border p-2.5 transition-all duration-300 sm:p-3 ${
                isSelected
                  ? `${item.lightBg} ${item.borderColor} shadow-xs ring-1 ring-emerald-500/30`
                  : isDimmed
                    ? 'border-slate-200/50 bg-slate-50/40 opacity-40 hover:opacity-75 dark:border-slate-800/50 dark:bg-slate-900/40'
                    : 'border-slate-200/80 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-100/80 dark:border-slate-800/80 dark:bg-slate-900/70 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="block truncate text-xs font-semibold text-slate-700 sm:text-sm dark:text-slate-200">
                  {item.label}
                </span>
              </div>

              <div
                className={`flex shrink-0 items-center gap-2 overflow-hidden transition-all duration-300 ease-out ${
                  isCurrentHovered
                    ? 'ml-2 max-w-[200px] border-l border-slate-200 pl-2 opacity-100 dark:border-slate-700'
                    : 'ml-0 max-w-0 border-l-0 pl-0 opacity-0'
                }`}
              >
                <span className="whitespace-nowrap text-xs font-bold tabular-nums text-slate-900 sm:text-sm dark:text-slate-50">
                  {item.latestValue}
                </span>
                {item.delta && (
                  <span
                    className={`whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-bold sm:text-[11px] ${item.lightBg} ${item.textColor}`}
                  >
                    {item.delta}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="h-[270px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            key={`chart-${animKey}-${triggerKey}`}
            data={rows}
            margin={{ top: 12, right: 14, bottom: 4, left: -6 }}
          >
            <CartesianGrid vertical={false} stroke={gridStroke} strokeDasharray="3 3" />
            <XAxis
              dataKey="month"
              interval="preserveStartEnd"
              minTickGap={32}
              tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
              dy={6}
            />
            <YAxis
              domain={fixedYDomain}
              tickFormatter={(v) => compact(v)}
              tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={54}
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: tickColor, strokeWidth: 1, strokeDasharray: '3 3' }}
            />

            {activeLines.map((line) => (
              <Line
                key={line.id}
                type="monotone"
                dataKey={line.id}
                stroke={line.color}
                strokeWidth={1.8}
                dot={false}
                activeDot={{
                  r: 5,
                  fill: line.color,
                  stroke: isDark ? '#26231E' : '#ffffff',
                  strokeWidth: 2
                }}
                name={line.label}
                isAnimationActive={true}
                animationDuration={750}
                animationEasing="ease-out"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
