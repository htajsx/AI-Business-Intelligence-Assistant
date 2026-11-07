import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, ArrowRight } from 'lucide-react'
import Collapse from '../../ui/Collapse'
import ColumnRow from './ColumnRow'
import RelationRow from './RelationRow'
import { card, divider, focusRing, MONO } from '../../../utils/ui'

export default function TableAccordion({ table, defaultOpen, onAsk, highlight, forceOpen }) {
  const [open, setOpen] = useState(defaultOpen)

  useEffect(() => {
    if (forceOpen) setOpen(true)
  }, [forceOpen])

  return (
    <div className={`overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-[#2F2A24] dark:bg-[#1B1814] ${card}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between p-4.5 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03] ${focusRing}`}
      >
        <div className="flex items-center gap-3">
          <span style={{ fontFamily: MONO }} className="text-[15px] font-extrabold text-slate-950 dark:text-white">
            {highlight(table.name)}
          </span>
          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-800 dark:bg-white/10 dark:text-slate-200">
            {table.rowCount} rows
          </span>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {table.relations.length} relations
          </span>
          <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight size={18} className="text-slate-600 dark:text-slate-300" />
          </motion.div>
        </div>
      </button>

      <Collapse open={open}>
        <div className={`border-t p-5 pt-3 ${divider} bg-slate-50/40 dark:bg-[#211D18]/30`}>
          <div className="mb-2.5 mt-2 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Table Attributes (Columns)
          </div>
          <div className="flex flex-col gap-1">
            {table.columns.map((c) => (
              <ColumnRow key={c.name} column={c} highlight={highlight} />
            ))}
          </div>

          {table.relations.length > 0 && (
            <>
              <div className={`mb-2.5 mt-5 border-t pt-4 text-xs font-extrabold uppercase tracking-wider text-slate-800 ${divider} dark:text-slate-200`}>
                Foreign Key Relations
              </div>
              <div className="flex flex-col gap-1.5">
                {table.relations.map((r, i) => (
                  <RelationRow key={i} relation={r} highlight={highlight} />
                ))}
              </div>
            </>
          )}

          {table.question && (
            <div className={`mt-5 flex justify-end border-t pt-3.5 ${divider}`}>
              <motion.button
                whileHover={{ scale: 1.02, x: 2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onAsk(table.question)}
                className={`flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 ${focusRing}`}
              >
                Query data from this table <ArrowRight size={13} />
              </motion.button>
            </div>
          )}
        </div>
      </Collapse>
    </div>
  )
}