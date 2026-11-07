import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TableAccordion from './TableAccordion'
import ErdView from './ErdView'
import { focusRing } from '../../../utils/ui'

export default function TablesTab({ tables, query, onAsk, highlight }) {
  const [view, setView] = useState('list')

  const filtered = tables.map((t) => {
    const tableMatch = t.name.toLowerCase().includes(query)
    const matchedCols = t.columns.filter(
      (c) => c.name.toLowerCase().includes(query) || c.description.toLowerCase().includes(query)
    )
    if (tableMatch) return { ...t, forceOpen: !!query }
    if (matchedCols.length > 0) return { ...t, columns: matchedCols, forceOpen: true }
    return null
  }).filter(Boolean)

  if (query && filtered.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-sm font-bold text-slate-700 dark:border-[#36302A] dark:text-slate-300">
        No tables match "{query}". Try searching for "orders", "customers", or "products".
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white p-1 shadow-xs dark:border-[#36302A] dark:bg-[#211D18]">
          <button
            onClick={() => setView('list')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              view === 'list'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
            } ${focusRing}`}
          >
            Table Catalog
          </button>
          <button
            onClick={() => setView('diagram')}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              view === 'diagram'
                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                : 'text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white'
            } ${focusRing}`}
          >
            ERD Diagram
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={view}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {view === 'list' ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}
              className="flex flex-col gap-3.5"
            >
              {filtered.map((t) => (
                <motion.div
                  key={t.name}
                  variants={{ hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } }}
                >
                  <TableAccordion table={t} defaultOpen={t.defaultOpen} forceOpen={t.forceOpen} onAsk={onAsk} highlight={highlight} />
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <ErdView />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}