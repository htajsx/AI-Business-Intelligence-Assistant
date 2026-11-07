import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { useIsDarkMode } from '../../../utils/theme'
import { getGridColor, getTickColor } from '../../charts/shared/chartTheme'

function Tip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs font-semibold shadow-xl backdrop-blur-xs dark:border-slate-800/90 dark:bg-slate-900/95">
      <p className="mb-1.5 border-b border-slate-100 pb-1 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
        Period: {label || point?.period}
      </p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
          <span className="h-2 w-2 rounded-full bg-amber-500" />
          Review score:
        </span>
        <span className="font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
          {Number(payload[0].value).toFixed(2)} / 5.0
        </span>
      </div>
    </div>
  )
}

export default function SatisfactionTrendChart({ rows, triggerKey }) {
  const isDark = useIsDarkMode()
  const data = Array.isArray(rows) ? rows : []
  const scores = data.map((r) => r?.score).filter((s) => typeof s === 'number' && Number.isFinite(s))
  if (scores.length === 0) return null

  const grid = getGridColor(isDark)
  const tick = getTickColor(isDark)

  const minVal = Math.min(...scores)
  const maxVal = Math.max(...scores)

  const lo = Math.max(1.0, Math.floor((minVal - 0.1) * 5) / 5)
  const hi = Math.min(5.0, Math.ceil((maxVal + 0.1) * 5) / 5)

  const ticks = []
  for (let v = lo; v <= hi + 0.001; v += 0.2) {
    ticks.push(Number(v.toFixed(1)))
  }

  return (
    <div className="h-[270px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart key={`csat-${triggerKey}`} data={data} margin={{ top: 14, right: 14, left: -10, bottom: 4 }}>
          <defs>
            <linearGradient id="csatArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#B7832A" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#B7832A" stopOpacity={0.02} />
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
            domain={[lo, hi]}
            ticks={ticks}
            tickFormatter={(v) => v.toFixed(1)}
            width={42}
          />
          <Tooltip content={<Tip />} cursor={{ stroke: tick, strokeWidth: 1, strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="score" stroke="none" fill="url(#csatArea)" />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#B7832A"
            strokeWidth={2.6}
            dot={{ r: 3.5, strokeWidth: 2, stroke: isDark ? '#26231E' : '#fff', fill: '#B7832A' }}
            activeDot={{ r: 6, stroke: isDark ? '#26231E' : '#fff', strokeWidth: 2, fill: '#B7832A' }}
            name="Review score"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
