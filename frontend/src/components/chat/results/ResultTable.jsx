import { motion } from 'framer-motion'
import { formatValue } from '../../../utils/format'
import { humanizeLabel } from '../../../utils/labels'

export default function ResultTable({ table, maxRows, onShowMore }) {
  if (!table?.rows?.length) return null
  const { columns = [], rows = [], formats = {}, footer } = table

  const displayedRows = typeof maxRows === 'number' && maxRows > 0 ? rows.slice(0, maxRows) : rows
  const hasMore = Boolean(maxRows && rows.length > maxRows)

  const isNumericColumn = (col) => {
    return rows.some((r) => typeof r[col] === 'number')
  }

  return (
    <div className="thin-scroll max-h-80 w-full overflow-auto rounded-b-xl">
      <table className="w-full border-collapse text-[13.5px]">
        <thead className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 backdrop-blur-md dark:border-slate-800/90 dark:bg-[#211D18]/95">
          <tr className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            {columns.map((c) => (
              <th
                key={c}
                className={`whitespace-nowrap px-3 py-2 ${
                  isNumericColumn(c) ? 'text-right' : 'text-left'
                }`}
              >
                {humanizeLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#2A2520]">
          {displayedRows.map((row, i) => (
            <motion.tr
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2, delay: Math.min(0.2, i * 0.02) }}
              className="transition-colors hover:bg-indigo-50/50 even:bg-slate-50/30 dark:hover:bg-indigo-500/10 dark:even:bg-slate-900/20"
            >
              {columns.map((c) => {
                const v = row[c]
                const isNum = typeof v === 'number'
                const signed = formats[c] === 'signed_percent'

                let displayVal
                if (isNum) {
                  displayVal = formatValue(v, formats[c])
                } else if (typeof v === 'string') {
                  displayVal = humanizeLabel(v)
                } else {
                  displayVal = v ?? '—'
                }

                return (
                  <td
                    key={c}
                    className={`whitespace-nowrap px-3 py-2 text-xs ${
                      isNum
                        ? 'text-right font-medium tabular-nums text-slate-900 dark:text-slate-100'
                        : 'text-left font-normal text-slate-800 dark:text-slate-200'
                    } ${
                      signed
                        ? v >= 0
                          ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                          : 'font-semibold text-rose-600 dark:text-rose-400'
                        : ''
                    }`}
                  >
                    {displayVal}
                  </td>
                )
              })}
            </motion.tr>
          ))}
          {footer && (
            <tr className="border-t border-slate-200 bg-slate-50/70 dark:border-slate-800 dark:bg-[#211D18]/50">
              <td
                colSpan={columns.length}
                className="px-3 py-1.5 text-xs font-medium italic text-slate-500 dark:text-slate-400"
              >
                {footer}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {hasMore && (
        <div className="flex items-center justify-between border-t border-slate-200/80 px-3 py-2 text-xs bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Showing 5 of {rows.length} rows
          </span>
          {onShowMore && (
            <button
              type="button"
              onClick={onShowMore}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400"
            >
              Show more &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  )
}
