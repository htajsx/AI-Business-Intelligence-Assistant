import { MONO } from '../../../utils/ui'

export default function ColumnRow({ column, highlight }) {
  return (
    <div className="-mx-2 flex flex-col gap-1 rounded-xl px-3 py-2 transition-colors hover:bg-slate-100/80 sm:grid sm:grid-cols-[1.2fr_90px_2fr] sm:items-center sm:gap-3 dark:hover:bg-white/[0.05]">
      <div className="flex items-center gap-2">
        <span style={{ fontFamily: MONO }} className="truncate text-[13.5px] font-bold text-slate-950 dark:text-white">
          {highlight(column.name)}
        </span>
        {column.isKey && (
          <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold uppercase text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
            PK
          </span>
        )}
      </div>
      <div style={{ fontFamily: MONO }} className="text-xs font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
        {column.type}
      </div>
      <div className="text-[13px] font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
        {highlight(column.description)}
      </div>
    </div>
  )
}