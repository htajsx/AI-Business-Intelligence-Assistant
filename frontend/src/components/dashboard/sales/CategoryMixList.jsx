import { formatCurrency } from '../../../utils/format'
import { humanizeLabel } from '../../../utils/labels'

export default function CategoryMixList({ rows = [], isSingleCategory = false, totalRevenue }) {
  const items = Array.isArray(rows) ? rows.filter((r) => Number.isFinite(r?.value)) : []
  const total = typeof totalRevenue === 'number' && totalRevenue > 0
    ? totalRevenue
    : items.reduce((sum, r) => sum + r.value, 0)
  if (items.length === 0 || total <= 0) return null

  if (isSingleCategory || items.length === 1) {
    const r = items[0]
    const pct = 100
    return (
      <div className="py-2">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex min-w-0 items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
            <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: r.color || '#590907' }} />
            <span className="truncate text-sm">{humanizeLabel(r.name)}</span>
          </span>
          <span className="shrink-0 font-extrabold tabular-nums text-slate-900 dark:text-slate-50">
            {pct.toFixed(1)}%
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: r.color || '#590907' }} />
        </div>
        <p className="mt-1.5 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
          {formatCurrency(r.value)}
        </p>
      </div>
    )
  }

  return (
    <div className="thin-scroll h-full min-h-0 w-full overflow-y-auto pr-1.5 pb-3">
      <ul className="space-y-3">
        {items.map((r) => {
          const pct = (r.value / total) * 100
          return (
            <li key={r.name} className="group">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-800 dark:text-slate-100">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-sm shadow-xs transition-transform group-hover:scale-110"
                    style={{ backgroundColor: r.color || '#85877B' }}
                  />
                  <span className="truncate">{humanizeLabel(r.name)}</span>
                </span>
                <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-slate-50">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200/90 dark:bg-slate-800">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(100, Math.max(0, pct))}%`, backgroundColor: r.color || '#85877B' }}
                />
              </div>
              <p className="mt-0.5 text-[11px] font-medium tabular-nums text-slate-500 dark:text-slate-400">
                {formatCurrency(r.value)}
              </p>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
