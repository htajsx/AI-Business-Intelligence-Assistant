import { AlertCircle, Info } from 'lucide-react'

export default function CaveatBlock({ text, level = 'info' }) {
  if (!text) return null

  const isWarn = level === 'warn'

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-relaxed ${
        isWarn
          ? 'border-amber-200/90 bg-amber-50/80 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200'
          : 'border-slate-200/90 bg-slate-50/90 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300'
      }`}
    >
      {isWarn ? (
        <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
      ) : (
        <Info size={16} className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
      )}
      <div className="flex-1 font-medium">{text}</div>
    </div>
  )
}

