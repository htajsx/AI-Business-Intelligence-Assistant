import { Sparkles } from 'lucide-react'
import ChatMarkdown from './ChatMarkdown'

export default function InsightBlock({ text, evidence = [] }) {
  if (!text) return null

  return (
    <div className="rounded-xl border border-indigo-100/90 bg-indigo-50/40 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20">
      <div className="mb-1.5 flex items-center gap-2">
        <Sparkles size={16} className="text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300">
          Executive Insights
        </span>
      </div>

      <ChatMarkdown content={text} className="text-[13.5px]" />

      {Array.isArray(evidence) && evidence.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 border-t border-indigo-100/60 pt-2.5 dark:border-indigo-900/40">
          {evidence.map((ev, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-700 shadow-xs dark:bg-slate-900/80 dark:text-slate-300"
            >
              <span className="text-slate-400">{ev.metric || 'Metric'}:</span>
              <strong className="font-bold tabular-nums text-slate-900 dark:text-slate-100">{String(ev.value)}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

