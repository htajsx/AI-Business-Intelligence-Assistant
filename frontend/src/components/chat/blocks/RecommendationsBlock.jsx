import { CheckCircle2, TrendingUp } from 'lucide-react'

export default function RecommendationsBlock({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
        <TrendingUp size={16} className="text-emerald-600 dark:text-emerald-400" />
        <span>Actionable Growth Recommendations</span>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((item, idx) => {
          const confidence = item.confidence || 'medium'
          let confClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
          if (confidence === 'high') {
            confClass = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
          } else if (confidence === 'low') {
            confClass = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
          }

          return (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-3.5 shadow-xs transition-shadow hover:shadow-sm dark:border-slate-800 dark:bg-[#211D18]"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                    <CheckCircle2 size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>Action {idx + 1}</span>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${confClass}`}>
                    {confidence} confidence
                  </span>
                </div>

                <p className="mt-2 text-xs font-semibold text-slate-800 dark:text-slate-200 leading-snug">
                  {item.action}
                </p>

                {item.evidence && (
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <strong className="font-semibold text-slate-700 dark:text-slate-300">Evidence: </strong>
                    {item.evidence}
                  </p>
                )}
              </div>

              {item.measure && (
                <div className="mt-2.5 border-t border-slate-100 pt-2 text-[10.5px] font-medium text-slate-400 dark:border-slate-800/80 dark:text-slate-500">
                  Target metric: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.measure}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

