import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Download } from 'lucide-react'
import { formatValue } from '../../../utils/format'
import { humanizeLabel } from '../../../utils/labels'
import { exportTableToCsv } from '../../../utils/csvExport'

export default function TableBlock({ columns = [], rows = [], maxRows = 5 }) {
  const [expanded, setExpanded] = useState(false)

  const isNumericColumn = (col) => {
    return rows.some((r) => typeof r[col] === 'number')
  }

  const visibleRows = useMemo(() => {
    if (expanded || rows.length <= maxRows) return rows
    return rows.slice(0, maxRows)
  }, [expanded, rows, maxRows])

  if (!rows || rows.length === 0) return null

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white dark:border-slate-800 dark:bg-[#1B1814]">
      <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-2.5 bg-slate-50/70 dark:border-slate-800 dark:bg-[#211D18]/70">
        <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Result Data ({rows.length} rows)
        </span>
        <button
          type="button"
          onClick={() => exportTableToCsv(columns, rows, 'query_results.csv')}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Download size={13} />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="thin-scroll max-h-80 w-full overflow-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="sticky top-0 z-10 border-b border-slate-200/90 bg-slate-50/95 backdrop-blur-md dark:border-slate-800/90 dark:bg-[#211D18]/95">
            <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {columns.map((c) => (
                <th
                  key={c}
                  className={`whitespace-nowrap px-4 py-2.5 ${
                    isNumericColumn(c) ? 'text-right' : 'text-left'
                  }`}
                >
                  {humanizeLabel(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#2A2520]">
            {visibleRows.map((row, i) => (
              <tr
                key={i}
                className="transition-colors hover:bg-indigo-50/40 even:bg-slate-50/25 dark:hover:bg-indigo-950/20 dark:even:bg-slate-900/20"
              >
                {columns.map((c) => {
                  const v = row[c]
                  const isNum = typeof v === 'number'
                  return (
                    <td
                      key={c}
                      className={`whitespace-nowrap px-4 py-2 text-[12.5px] ${
                        isNum
                          ? 'text-right font-medium tabular-nums text-slate-900 dark:text-slate-100'
                          : 'text-left font-normal text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {isNum ? formatValue(v) : typeof v === 'string' ? humanizeLabel(v) : v ?? '—'}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > maxRows && (
        <div className="border-t border-slate-100 p-2 text-center dark:border-slate-800/70">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
          >
            <span>{expanded ? 'Show first 5 rows' : `View all ${rows.length} rows`}</span>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}
    </div>
  )
}

