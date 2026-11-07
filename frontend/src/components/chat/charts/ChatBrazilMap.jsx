import { useMemo, useState } from 'react'
import BrazilDotMap from '../../charts/maps/BrazilDotMap'
import { formatStateName } from '../../../utils/labels'
import { formatChartValue } from '../../charts/shared/chartTheme'

export default function ChatBrazilMap({ rows = [], xKey = 'state', yKey = 'value', yFormat = 'percent' }) {
  const [hovered, setHovered] = useState(null)

  const { statesData, top5, bottom5 } = useMemo(() => {
    if (!Array.isArray(rows) || rows.length === 0) {
      return { statesData: [], top5: [], bottom5: [] }
    }

    const cleaned = rows
      .filter((r) => r && typeof r[xKey] === 'string' && typeof r[yKey] === 'number')
      .map((r) => {
        const code = String(r[xKey]).trim().toUpperCase()
        const val = r[yKey]
        return {
          state: code,
          orders: val,
          value: val,
          name: formatStateName(code)
        }
      })
      .sort((a, b) => b.value - a.value)

    return {
      statesData: cleaned,
      top5: cleaned.slice(0, 5),
      bottom5: cleaned.length > 5 ? cleaned.slice(-5).reverse() : []
    }
  }, [rows, xKey, yKey])

  if (!statesData.length) {
    return (
      <div className="flex h-48 items-center justify-center text-xs text-slate-400">
        No state data available
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 py-2 lg:flex-row lg:items-center">
      <div className="mx-auto max-w-[340px] flex-1">
        <BrazilDotMap states={statesData} hovered={hovered} onHover={setHovered} />
      </div>

      <div className="flex flex-1 flex-col gap-3.5 pr-2">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <span>Top Performing States</span>
            <span>Value</span>
          </div>
          <div className="space-y-1">
            {top5.map((item, idx) => {
              const active = hovered === item.state
              return (
                <div
                  key={item.state}
                  onMouseEnter={() => setHovered(item.state)}
                  onMouseLeave={() => setHovered(null)}
                  className={`flex items-center justify-between rounded-lg px-2.5 py-1 text-xs transition-colors ${
                    active ? 'bg-indigo-50 font-bold dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {idx + 1}
                    </span>
                    <span className="truncate text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                  </span>
                  <span className="font-bold tabular-nums text-slate-900 dark:text-slate-50">
                    {formatChartValue(item.value, yFormat)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {bottom5.length > 0 && (
          <div className="border-t border-slate-100 pt-2 dark:border-slate-800/70">
            <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              <span>Lowest Performing States</span>
              <span>Value</span>
            </div>
            <div className="space-y-1">
              {bottom5.map((item) => {
                const active = hovered === item.state
                return (
                  <div
                    key={item.state}
                    onMouseEnter={() => setHovered(item.state)}
                    onMouseLeave={() => setHovered(null)}
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1 text-xs transition-colors ${
                      active ? 'bg-amber-50 font-bold dark:bg-amber-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="truncate text-slate-700 dark:text-slate-300">
                      {item.name}
                    </span>
                    <span className="font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      {formatChartValue(item.value, yFormat)}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
