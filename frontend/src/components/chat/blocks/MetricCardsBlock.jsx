import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { formatChartValue } from '../../charts/shared/chartTheme'

export default function MetricCardsBlock({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, idx) => {
        const tone = item.tone || 'neutral'
        const hasDelta = Boolean(item.delta)
        const isPositive = typeof item.delta === 'string' && item.delta.trim().startsWith('+')

        let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
        if (tone === 'good') {
          badgeClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
        } else if (tone === 'bad') {
          badgeClass = 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
        }

        const formattedVal =
          typeof item.value === 'number'
            ? formatChartValue(item.value, item.unit)
            : item.value ?? '—'

        return (
          <div
            key={idx}
            className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 shadow-xs transition-shadow hover:shadow-sm dark:border-slate-800/80 dark:bg-[#211D18]/60"
          >
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {item.label}
            </div>

            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-xl font-extrabold tracking-tight tabular-nums text-slate-950 dark:text-slate-50">
                {formattedVal}
              </span>

              {hasDelta && (
                <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${badgeClass}`}>
                  {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  <span>{item.delta}</span>
                </span>
              )}
            </div>

            {item.note && (
              <div className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                {item.note}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

