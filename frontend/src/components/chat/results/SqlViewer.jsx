import { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, Clock } from 'lucide-react'
import Collapse from '../../ui/Collapse'
import CopyButton from '../../ui/CopyButton'
import { MONO } from '../../../utils/ui'

const TOKEN =
  /('[^']*')|(\b\d+(?:\.\d+)?\b)|(--[^\n]*)|(\b(?:SELECT|FROM|JOIN|LEFT|RIGHT|INNER|OUTER|ON|WHERE|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|GROUP\s+BY|ORDER\s+BY|HAVING|LIMIT|OFFSET|AS|WITH|CASE|WHEN|THEN|ELSE|END|DISTINCT|DESC|ASC|UNION|ALL|OVER|PARTITION\s+BY)\b)/gi

function highlight(sql) {
  const out = []
  let last = 0
  let k = 0
  for (const m of sql.matchAll(TOKEN)) {
    if (m.index > last) out.push(sql.slice(last, m.index))
    const cls = m[1]
      ? 'text-emerald-300 font-medium'
      : m[2]
        ? 'text-amber-300 font-semibold'
        : m[3]
          ? 'italic text-slate-400'
          : 'font-extrabold text-indigo-300'
    out.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>,
    )
    last = m.index + m[0].length
  }
  if (last < sql.length) out.push(sql.slice(last))
  return out
}

export default function SqlViewer({ sql, tables = [], tools = [], latency = 0 }) {
  const [open, setOpen] = useState(false)

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center justify-between px-5 py-3 text-[13px] font-bold text-slate-800 transition-colors hover:bg-slate-50 hover:text-indigo-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-white"
      >
        <div className="flex items-center gap-2">
          <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex text-indigo-600 dark:text-indigo-400">
            <ChevronRight size={16} />
          </motion.span>
          <span>SQL Query Code &amp; Execution Tools</span>
        </div>
        {latency > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            <Clock size={13} />
            {(latency / 1000).toFixed(2)}s
          </span>
        )}
      </button>

      <Collapse open={open}>
        <div className="space-y-3.5 px-5 pb-5 pt-1">
          {tools.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Tools invoked:</span>
              {tools.map((t) => (
                <span
                  key={t}
                  className="flex items-center rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300"
                  style={{ fontFamily: MONO }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl border border-slate-700/60 bg-[#17140F] shadow-lg">
            <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-2">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
                <span className="ml-2 text-[11px] font-mono font-bold text-slate-400">query.sql</span>
              </div>
              <CopyButton
                text={sql}
                label
                size={13}
                className="rounded-lg bg-white/10 px-2.5 py-1 text-xs font-bold text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
              />
            </div>
            <pre
              className="thin-scroll overflow-x-auto p-4 text-[13.5px] leading-relaxed text-slate-100"
              style={{ fontFamily: MONO }}
            >
              <code>{highlight(sql)}</code>
            </pre>
          </div>

          {tables.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                Scanned tables:
              </span>
              {tables.map((t) => (
                <span
                  key={t}
                  className="rounded-lg border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-900 dark:border-white/10 dark:bg-white/10 dark:text-slate-100"
                  style={{ fontFamily: MONO }}
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </Collapse>
    </div>
  )
}