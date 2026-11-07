import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts'
import { useIsDarkMode } from '../../../utils/theme'
import { isNum } from '../../../utils/format'
import { getGridColor, getTickColor } from '../../charts/shared/chartTheme'
import { SLA_DAYS } from '../shared/kpiHelpers'

const VALUE_KEYS = ['days', 'avgDays', 'avg_days', 'deliveryDays', 'delivery_days', 'avgDeliveryDays', 'avg_delivery_days', 'deliveryTime', 'delivery_time', 'value']

const LINE_COLOR = '#590907'
const OK_COLOR = '#6B8A4F'
const OVER_COLOR = '#8E2F2B'
const TARGET_COLOR = '#8E2F2B'

function pickValue(row) {
  for (const key of VALUE_KEYS) {
    const raw = row?.[key]
    if (raw === null || raw === undefined || raw === '') continue
    const n = Number(raw)
    if (isNum(n)) return n
  }
  return null
}

function normalize(rows) {
  if (!Array.isArray(rows)) return []
  return rows.map((r) => ({
    period: r?.period ?? r?.month ?? r?.label ?? '',
    days: pickValue(r),
    sla: isNum(Number(r?.sla)) && r?.sla !== null && r?.sla !== undefined ? Number(r.sla) : SLA_DAYS
  }))
}

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  if (!point || !isNum(point.days)) return null
  const diff = point.days - point.sla
  const over = diff > 0
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs font-semibold shadow-xl backdrop-blur-xs dark:border-slate-800/90 dark:bg-slate-900/95">
      <p className="mb-1.5 border-b border-slate-100 pb-1 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
        Period: {label || point.period}
      </p>
      <div className="space-y-1">
        <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
          <span>Avg delivery:</span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{point.days.toFixed(2)} days</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
          <span>Target Benchmark:</span>
          <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{point.sla} days</span>
        </p>
        <p className={`pt-1 font-bold ${over ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
          {over ? `+${diff.toFixed(2)} days over target` : `${Math.abs(diff).toFixed(2)} days within target`}
        </p>
      </div>
    </div>
  )
}

function makeDot(ringColor) {
  return function SlaDot({ cx, cy, payload, index }) {
    if (!isNum(cx) || !isNum(cy) || !payload || !isNum(payload.days)) return <g key={`dot-${index}`} />
    const over = payload.days > payload.sla
    const color = over ? OVER_COLOR : OK_COLOR
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={6.5} fill={color} fillOpacity={0.22} />
        <circle cx={cx} cy={cy} r={4} fill={color} stroke={ringColor} strokeWidth={2} />
      </g>
    )
  }
}

function makeActiveDot(ringColor) {
  return function SlaActiveDot({ cx, cy, payload }) {
    if (!isNum(cx) || !isNum(cy) || !payload || !isNum(payload.days)) return null
    const over = payload.days > payload.sla
    const color = over ? OVER_COLOR : OK_COLOR
    return (
      <g>
        <circle cx={cx} cy={cy} r={11} fill={color} fillOpacity={0.2} />
        <circle cx={cx} cy={cy} r={6.5} fill={color} stroke={ringColor} strokeWidth={2.5} />
      </g>
    )
  }
}

export default function DeliverySlaChart({ rows, triggerKey }) {
  const isDark = useIsDarkMode()
  const data = normalize(rows)
  if (!data.some((r) => isNum(r.days))) return null

  const grid = getGridColor(isDark)
  const tick = getTickColor(isDark)
  const ringColor = isDark ? '#26231E' : '#ffffff'

  const validDays = data.map((r) => r.days).filter(isNum)
  const maxVal = validDays.length > 0 ? Math.max(...validDays, SLA_DAYS) : SLA_DAYS
  const yMax = Math.max(15, Math.ceil((maxVal + 1) / 5) * 5)
  const ticks = []
  for (let i = 0; i <= yMax; i += 5) {
    ticks.push(i)
  }

  return (
    <div className="flex h-[270px] w-full flex-col">
      <div className="mb-1 flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/25" />
          Within target
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-red-500/25" />
          Over target
        </span>
      </div>
      <div className="min-h-0 w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart key={`sla-${triggerKey}`} data={data} margin={{ top: 14, right: 14, left: -10, bottom: 4 }}>
            <defs>
              <linearGradient id="slaArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={LINE_COLOR} stopOpacity={isDark ? 0.32 : 0.3} />
                <stop offset="100%" stopColor={LINE_COLOR} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="slaLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={isDark ? '#B9857D' : '#590907'} />
                <stop offset="100%" stopColor={isDark ? '#B9857D' : '#6E1512'} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
            <XAxis
              dataKey="period"
              interval="preserveStartEnd"
              minTickGap={32}
              axisLine={false}
              tickLine={false}
              tick={{ fill: tick, fontSize: 11, fontWeight: 600 }}
              dy={6}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: tick, fontSize: 11, fontWeight: 600 }}
              domain={[0, yMax]}
              ticks={ticks}
              tickFormatter={(v) => `${v}d`}
              width={42}
            />
            <Tooltip content={<Tip />} cursor={{ stroke: tick, strokeWidth: 1, strokeDasharray: '3 3' }} />
            <ReferenceArea y1={SLA_DAYS} y2={yMax} fill={TARGET_COLOR} fillOpacity={isDark ? 0.07 : 0.05} stroke="none" />
            <ReferenceLine
              y={SLA_DAYS}
              stroke={TARGET_COLOR}
              strokeDasharray="5 4"
              strokeWidth={1.8}
              label={{
                value: `Target ${SLA_DAYS}d`,
                position: 'insideTopRight',
                fill: TARGET_COLOR,
                fontSize: 11,
                fontWeight: 700
              }}
            />
            <Area type="monotone" dataKey="days" stroke="none" fill="url(#slaArea)" connectNulls />
            <Line
              type="monotone"
              dataKey="days"
              name="Avg delivery days"
              stroke="url(#slaLine)"
              strokeWidth={2.8}
              strokeLinecap="round"
              connectNulls
              dot={makeDot(ringColor)}
              activeDot={makeActiveDot(ringColor)}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}