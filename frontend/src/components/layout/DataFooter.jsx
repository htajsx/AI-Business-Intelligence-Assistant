import { motion, useReducedMotion } from 'framer-motion'
import { Database, ShieldCheck, CheckCircle2 } from 'lucide-react'

export default function DataFooter({ meta }) {
  const reduce = useReducedMotion()

  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400">
      <div className="flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-1.5">
          <Database size={13} className="text-slate-400 dark:text-slate-500" />
          <span>Warehouse: <strong className="text-slate-700 dark:text-slate-300">{meta?.dataset || 'Olist Brazilian E-Commerce Warehouse'}</strong></span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span className="font-semibold text-slate-700 dark:text-slate-300">SQLite Demo (Read-only)</span>
        </div>
        <span>·</span>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-indigo-500" />
          <span>{meta?.ordersIndexed || '100,000+ orders indexed'}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {!reduce && (
            <motion.span
              animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              className="absolute inset-0 rounded-full bg-emerald-500"
            />
          )}
          <span className="relative h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span>Warehouse Sync: {meta?.lastUpdated || 'Just now'} · Filtered for {meta?.period || 'Q4 2017'}</span>
      </div>
    </div>
  )
}