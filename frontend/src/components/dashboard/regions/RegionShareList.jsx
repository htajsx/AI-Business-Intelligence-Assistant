import { motion, useReducedMotion } from 'framer-motion'
import { formatInt } from '../../../utils/format'
import { focusRing } from '../../../utils/ui'

export default function RegionShareList({ rows, hovered, onHover }) {
  const reduceMotion = useReducedMotion()
  const maxShare = rows.reduce((max, row) => Math.max(max, row.share), 0)

  return (
    <ul className="space-y-0.5">
      {rows.map((row) => {
        const active = hovered === row.key || (row.states ? row.states.includes(hovered) : false)
        const width = maxShare > 0 ? (row.share / maxShare) * 100 : 0
        return (
          <li
            key={row.key}
            tabIndex={0}
            aria-label={`${row.name}: ${row.share.toFixed(1)}% of orders, ${formatInt(row.orders)} orders`}
            onMouseEnter={() => onHover(row.key)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(row.key)}
            onBlur={() => onHover(null)}
            className={`flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors duration-150 sm:gap-3 sm:px-3 ${
              active ? 'bg-slate-100 dark:bg-slate-800/70' : ''
            } ${focusRing}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: row.color }} />
            <span className="w-20 shrink-0 truncate text-xs font-semibold text-slate-800 dark:text-slate-100 sm:w-28">{row.name}</span>
            <span className="w-11 shrink-0 text-right text-xs font-bold tabular-nums text-slate-900 dark:text-slate-50">
              {row.share.toFixed(1)}%
            </span>
            <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <motion.span
                className="block h-full rounded-full"
                style={{ backgroundColor: row.color }}
                initial={reduceMotion ? false : { width: 0 }}
                animate={{ width: `${width}%` }}
                transition={reduceMotion ? { duration: 0 } : { duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </span>
            <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-300">
              {formatInt(row.orders)}
            </span>
          </li>
        )
      })}
    </ul>
  )
}
