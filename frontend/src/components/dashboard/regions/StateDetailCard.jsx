import { card, divider } from '../../../utils/ui'
import { formatInt, formatCurrency, isNum } from '../../../utils/format'

function StateTable({ states }) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="sticky top-0 z-10 bg-white shadow-xs dark:bg-slate-900">
        <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <th className="py-2.5 pr-2 font-bold">State</th>
          <th className="py-2.5 pr-2 text-right font-bold">Orders</th>
          <th className="py-2.5 pr-2 text-right font-bold">Revenue</th>
          <th className="py-2.5 text-right font-bold">Days</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {states.map((s) => (
          <tr key={s.state} className="font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800/40">
            <td className="py-2.5 pr-2">
              <span className="mr-1.5 inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                {s.state}
              </span>
              <span className="text-xs">{s.name || s.state}</span>
            </td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{formatInt(s.orders)}</td>
            <td className="py-2.5 pr-2 text-right tabular-nums">{formatCurrency(s.revenue)}</td>
            <td className="py-2.5 text-right font-bold tabular-nums">
              <span className={s.avgDays > 12 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {isNum(s.avgDays) ? `${s.avgDays.toFixed(2)}d` : '—'}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default function StateDetailCard({ states, matchHeight = 0 }) {
  const list = Array.isArray(states) ? states : []
  const targetHeight = matchHeight > 0 ? matchHeight : 580

  if (list.length === 0) {
    return (
      <div
        style={{ height: `${targetHeight}px`, maxHeight: `${targetHeight}px` }}
        className={`flex flex-col rounded-2xl p-5 sm:p-6 ${card}`}
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 sm:text-base">State Detail</h3>
        <div className="flex flex-1 items-center justify-center text-xs font-semibold text-slate-400">No data</div>
      </div>
    )
  }

  return (
    <div
      style={{ height: `${targetHeight}px`, maxHeight: `${targetHeight}px` }}
      className={`flex flex-col overflow-hidden rounded-2xl p-5 sm:p-6 ${card}`}
    >
      <div className={`shrink-0 border-b pb-3 ${divider}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 sm:text-base">State Detail</h3>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {list.length} States
          </span>
        </div>
        <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
          Orders, revenue and transit duration breakdown
        </p>
      </div>

      <div className="mt-2 flex-1 min-h-0 overflow-y-auto thin-scroll pr-1.5">
        <StateTable states={list} />
      </div>
    </div>
  )
}
