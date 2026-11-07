import { Sparkles } from 'lucide-react'
import { card, divider, iconBtn } from '../../../utils/ui'

export default function ChartCard({
  title,
  subtitle,
  takeaway,
  footnote,
  badge,
  actions,
  onAsk,
  children,
  hasData = true,
  emptyText = 'No data',
  className = '',
  minHeight = 'min-h-[360px]'
}) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl p-5 sm:p-6 ${minHeight} ${card} ${className}`}>
      <div className={`shrink-0 flex items-start justify-between gap-3 border-b pb-3 ${divider}`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50 sm:text-base">{title}</h3>
            {badge && (
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {badge}
              </span>
            )}
          </div>
          {takeaway && <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-100">{takeaway}</p>}
          {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {actions}
          {onAsk && (
            <button
              type="button"
              aria-label={`Ask AI about ${title}`}
              title="Ask AI"
              onClick={() => onAsk(`Explain the key takeaways of "${title}" and what actions I should consider.`)}
              className={`${iconBtn} text-indigo-500 dark:text-indigo-300`}
            >
              <Sparkles size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="w-full flex-1 min-h-0 pt-3 flex flex-col overflow-hidden">
        {hasData && children ? (
          children
        ) : (
          <div className="flex h-full min-h-[220px] items-center justify-center text-xs font-semibold text-slate-400">
            {emptyText}
          </div>
        )}
      </div>
      {footnote && (
        <p className={`shrink-0 mt-3 border-t pt-2 text-[11px] font-medium text-slate-500 dark:text-slate-400 ${divider}`}>
          {footnote}
        </p>
      )}
    </div>
  )
}
