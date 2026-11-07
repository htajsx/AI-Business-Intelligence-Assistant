import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Database, Cpu, BarChart3 } from 'lucide-react'
import { card, divider } from '../../../utils/ui'

const PHASES = [
  { label: 'Analyzing business inquiry', icon: Cpu },
  { label: 'Compiling & executing SQL', icon: Database },
  { label: 'Synthesizing charts & insights', icon: BarChart3 }
]

function Shimmer({ className = '' }) {
  return (
    <div className={`relative overflow-hidden rounded-lg bg-slate-200/80 dark:bg-white/10 ${className}`}>
      <motion.span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
        initial={{ x: '-100%' }}
        animate={{ x: '250%' }}
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  )
}

export default function TypingSteps({ compact = false }) {
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setPhase((p) => Math.min(p + 1, PHASES.length - 1)), 1100)
    return () => clearInterval(t)
  }, [])

  if (compact) {
    const Icon = PHASES[phase].icon
    return (
      <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2.5 text-xs text-indigo-600 shadow-sm dark:border-[#36302A] dark:bg-[#1B1814] dark:text-indigo-400">
        <Icon size={14} className="animate-spin text-indigo-600 dark:text-indigo-400 shrink-0" />
        <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">{PHASES[phase].label}…</span>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -8, y: 14 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full"
      role="status"
      aria-label={`${PHASES[phase].label}…`}
    >
      <div className={`min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white/95 p-1 shadow-md dark:border-[#36302A] dark:bg-[#1B1814] ${card}`}>
        <div className="flex h-11 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-600 dark:bg-indigo-400" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
              System processing query...
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-400"
                animate={{ y: [0, -5, 0], scale: [1, 1.25, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 0.75, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
              />
            ))}
          </div>
        </div>

        <div className={`grid grid-cols-3 gap-3 border-t px-4 py-3.5 ${divider} bg-slate-50/50 dark:bg-[#211D18]/50`}>
          {PHASES.map((step, i) => {
            const done = i < phase
            const active = i === phase
            const Icon = step.icon
            return (
              <div key={step.label} className="min-w-0">
                <div
                  className={`mb-2 flex items-center gap-1.5 truncate text-[12px] transition-colors duration-300 ${
                    active
                      ? 'font-extrabold text-indigo-700 dark:text-indigo-300'
                      : done
                        ? 'font-bold text-emerald-600 dark:text-emerald-400'
                        : 'font-semibold text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {done ? (
                    <Check size={14} className="shrink-0 text-emerald-500 stroke-[3]" />
                  ) : (
                    <Icon size={14} className={`shrink-0 ${active ? 'animate-pulse text-indigo-600' : ''}`} />
                  )}
                  <span className="truncate">{step.label}</span>
                </div>
                <div className="relative h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                  {done && <span className="absolute inset-0 bg-emerald-500" />}
                  {active && (
                    <motion.span
                      className="absolute inset-y-0 left-0 w-2/5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                      initial={{ x: '-100%' }}
                      animate={{ x: '280%' }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className={`space-y-4 border-t px-5 py-5 ${divider}`}>
          <Shimmer className="h-5 w-3/5 rounded-md" />
          <div className="grid grid-cols-3 gap-3">
            <Shimmer className="h-16 rounded-xl" />
            <Shimmer className="h-16 rounded-xl" />
            <Shimmer className="h-16 rounded-xl" />
          </div>
          <Shimmer className="h-40 w-full rounded-xl" />
        </div>
      </div>
    </motion.div>
  )
}