export default function ReportTable({
  columns = [],
  rows = [],
  rowKey,
  dense = false,
  caption = null,
  className = '',
}) {
  const getRowKey = (row, index) => {
    if (typeof rowKey === 'function') return rowKey(row, index)
    if (typeof rowKey === 'string' && row[rowKey] !== undefined) return row[rowKey]
    return row.id || row.key || index
  }

  const pyClass = dense ? 'py-1.5' : 'py-2.5'

  return (
    <div className={`overflow-x-auto thin-scroll rounded-xl border border-slate-200 dark:border-[#2F2A24] ${className}`}>
      {caption && (
        <div className="border-b border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs font-semibold text-slate-600 dark:border-[#2F2A24] dark:bg-[#211D18]/60 dark:text-slate-400">
          {caption}
        </div>
      )}
      <table className="w-full table-fixed border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100/90 dark:border-[#2F2A24] dark:bg-[#211D18]">
            {columns.map((col) => {
              const alignClass =
                col.align === 'right'
                  ? 'text-right'
                  : col.align === 'center'
                    ? 'text-center'
                    : 'text-left'
              return (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={`px-3 py-2.5 text-[11px] font-extrabold uppercase tracking-wider text-slate-800 whitespace-nowrap dark:text-slate-200 ${alignClass}`}
                >
                  {col.header}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#2A2520]">
          {rows.map((row, idx) => {
            const key = getRowKey(row, idx)
            return (
              <tr
                key={key}
                className="transition-colors hover:bg-slate-50 dark:hover:bg-indigo-500/5"
              >
                {columns.map((col) => {
                  const alignClass =
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                  const cellValue = col.render ? col.render(row, idx) : row[col.key]
                  return (
                    <td
                      key={col.key}
                      className={`px-3 ${pyClass} tabular-nums text-slate-900 dark:text-slate-100 ${alignClass}`}
                    >
                      {cellValue}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

