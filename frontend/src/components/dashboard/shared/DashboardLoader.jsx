import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Database, BarChart3, Activity } from 'lucide-react'
import Loader from '../../ui/Loader'

const LOADING_STEPS = [
  { icon: Database, text: 'Querying Olist Data Warehouse (100k records)...' },
  { icon: Activity, text: 'Calculating revenue & delivery SLA benchmarks...' },
  { icon: BarChart3, text: 'Synthesizing category rankings and geographical metrics...' },
  { icon: Sparkles, text: 'Finalizing executive performance dashboard...' }
]

const LOADER_BAR_CSS = `
@keyframes dashboard-loader-slide {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.dashboard-loader-bar {
  animation: dashboard-loader-slide 1.5s ease-in-out infinite;
  will-change: transform;
}
`

export default function DashboardLoader() {
  const [stepIndex, setStepIndex] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % LOADING_STEPS.length)
    }, 1300)
    return () => clearInterval(timer)
  }, [])

  const CurrentIcon = LOADING_STEPS[stepIndex].icon

  return (
    <div className="relative flex min-h-[460px] w-full flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white/70 p-8 text-center backdrop-blur-md shadow-xs dark:border-slate-800/80 dark:bg-slate-900/70 overflow-hidden">
      <style>{LOADER_BAR_CSS}</style>

      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-gradient-to-tr from-indigo-500/20 via-violet-500/15 to-violet-500/0 blur-3xl dark:from-indigo-500/25 dark:via-violet-500/20" />

      <div className="relative z-10 mb-6 flex flex-col items-center justify-center py-2">
        <Loader />
      </div>

      <div className="relative z-10 max-w-md space-y-3">
        <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Synthesizing Real-time Metrics
        </h3>

        <div className="h-6 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              <CurrentIcon size={14} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{LOADING_STEPS[stepIndex].text}</span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mx-auto mt-4 h-1.5 w-60 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="dashboard-loader-bar h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500" />
        </div>
      </div>
    </div>
  )
}