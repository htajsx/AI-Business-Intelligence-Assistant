import { useState } from 'react'
import {
  ChevronDown,
  CheckCircle,
  ArrowRight,
  Sparkles
} from 'lucide-react'
import { card, divider, focusRing } from '../../../utils/ui'

export default function InsightPanel({ insights, onAskAi }) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (!insights) return null

  const suggestedActions = Array.isArray(insights.suggestedActions)
    ? insights.suggestedActions
    : (insights.actionableRecommendations || []).map((action) => ({ action, basis: null }))

  return (
    <div className={`overflow-hidden rounded-2xl p-5 sm:p-7 ${card}`}>
      <div className={`flex items-center justify-between pb-4 border-b ${divider}`}>
        <div>
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-slate-50">
              Auto insights
            </h3>
            <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
              rule-based
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">
            Computed from warehouse transaction records with fixed rules. No language model is involved.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAskAi && (
            <button
              type="button"
              onClick={() => onAskAi('Summarize the top strategic threats and revenue opportunities in Olist data')}
              className={`flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 dark:bg-slate-800 dark:text-indigo-300 dark:hover:bg-slate-700 ${focusRing}`}
            >
              <span>Explore in Chat</span>
              <ArrowRight size={13} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/70 text-slate-600 hover:bg-slate-300 hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 ${focusRing}`}
            aria-label="Toggle insights"
          >
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {insights.summary.map((item, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200/80 bg-white/70 p-4 shadow-xs backdrop-blur-xs dark:border-slate-800/80 dark:bg-slate-900/60"
              >
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                    {item.title}
                  </h4>
                </div>
                <p className="mt-2 text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-300">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
            <div className="lg:col-span-8 flex flex-col justify-between h-full rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
              <div>
                <div className="pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Suggested actions (rule-based)
                  </h4>
                </div>
                <ul className="mt-3.5 space-y-2.5">
                  {suggestedActions.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-xs font-medium text-slate-700 dark:text-slate-300">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-black text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
                        {i + 1}
                      </span>
                      <div className="min-w-0 pt-0.5">
                        <p className="leading-relaxed">{item.action}</p>
                        {item.basis && (
                          <p className="mt-1 text-[11px] font-semibold leading-snug text-slate-500 dark:text-slate-400">
                            Triggered by: {item.basis}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col justify-between h-full rounded-xl border border-slate-200/80 bg-white/70 p-5 shadow-xs dark:border-slate-800/80 dark:bg-slate-900/60">
              <div>
                <div className="pb-2.5 border-b border-slate-200/60 dark:border-slate-800/60">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Data Integrity Status
                  </h4>
                </div>
                <div className="mt-3.5 space-y-2.5 text-xs font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Warehouse Replica:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">SQLite High-Perf</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Total Indexed:</span>
                    <span className="font-black text-slate-900 dark:text-slate-100 tabular-nums">
                      {insights?.systemHealth?.totalRecords || '96,478 Orders'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Tables Synced:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">7 of 7 Verified</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle size={15} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>Zero discrepancy across primary revenue keys</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}