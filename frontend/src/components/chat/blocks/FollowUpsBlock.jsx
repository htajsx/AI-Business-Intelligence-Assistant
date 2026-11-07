import { ArrowRight, Sparkles } from 'lucide-react'

export default function FollowUpsBlock({ items = [], onPick }) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <div className="pt-1">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <Sparkles size={13} className="text-indigo-500" />
        <span>Suggested Follow-up Questions</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map((item, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onPick?.(item)}
            className="group flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-xs transition-all hover:border-indigo-500 hover:bg-indigo-50/50 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-indigo-400 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
          >
            <span>{item}</span>
            <ArrowRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-500 dark:text-slate-500" />
          </button>
        ))}
      </div>
    </div>
  )
}

