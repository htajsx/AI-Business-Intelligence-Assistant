import { motion, useReducedMotion } from 'framer-motion'
import { Check } from 'lucide-react'
import { card } from '../../../utils/ui'
import { PHASES } from '../../../hooks/useReport'

function PhaseIcon({ state, reduce }) {
  if (state === 'done') {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
        <Check size={13} strokeWidth={3} aria-hidden="true" />
      </span>
    )
  }
  if (state === 'active') {
    return (
      <span className="relative flex h-5 w-5 items-center justify-center">
        {!reduce && (
          <motion.span
            aria-hidden="true"
            className="absolute h-3.5 w-3.5 rounded-full bg-indigo-500"
            animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
          />
        )}
        <span className="relative h-2.5 w-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
      </span>
    )
  }
  return (
    <span className="flex h-5 w-5 items-center justify-center">
      <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-700" />
    </span>
  )
}

export default function ReportProgress({ phaseIndex }) {
  const reduce = useReducedMotion()
  const current = PHASES[Math.min(phaseIndex, PHASES.length - 1)]

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={current.label}
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`${card} mx-auto w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/95 px-8 py-8 shadow-xl dark:border-[#2F2A24] dark:bg-[#1B1814]/95`}
    >
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600"
          initial={{ width: reduce ? '90%' : '0%' }}
          animate={{ width: '92%' }}
          transition={{ duration: reduce ? 0 : 6, ease: 'easeOut' }}
        />
      </div>

      <ul className="mt-7 space-y-3.5">
        {PHASES.map((phase, i) => {
          const state = i < phaseIndex ? 'done' : i === phaseIndex ? 'active' : 'pending'
          const label = state === 'done' && phase.doneLabel ? phase.doneLabel : phase.label
          return (
            <motion.li
              key={phase.id}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: reduce ? 0 : i * 0.06 }}
              className="flex items-center gap-3.5 text-[14px]"
            >
              <PhaseIcon state={state} reduce={reduce} />
              <span
                className={`transition-colors duration-150 ${
                  state === 'pending'
                    ? 'font-medium text-slate-500 dark:text-slate-400'
                    : state === 'active'
                      ? 'font-extrabold text-indigo-700 dark:text-indigo-300'
                      : 'font-bold text-slate-900 dark:text-white'
                }`}
              >
                {label}
              </span>
            </motion.li>
          )
        })}
      </ul>

      <p className="mt-7 text-center text-xs font-bold text-slate-600 dark:text-slate-400">
        Data synthesis and KPI audits typically complete in 10–20 seconds.
      </p>
    </motion.div>
  )
}
