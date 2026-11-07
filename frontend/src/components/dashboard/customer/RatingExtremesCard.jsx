import { Star } from 'lucide-react'
import { isNum } from '../../../utils/format'

const RATING_GRADIENTS = {
  5: {
    label: '5 Stars',
    barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
  },
  4: {
    label: '4 Stars',
    barClass: 'bg-gradient-to-r from-emerald-500 to-emerald-400',
    textClass: 'text-emerald-700 dark:text-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
  },
  3: {
    label: '3 Stars',
    barClass: 'bg-gradient-to-r from-amber-400 to-amber-400',
    textClass: 'text-amber-700 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
  },
  2: {
    label: '2 Stars',
    barClass: 'bg-gradient-to-r from-amber-500 to-amber-500',
    textClass: 'text-amber-700 dark:text-amber-400',
    badgeClass: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
  },
  1: {
    label: '1 Star',
    barClass: 'bg-gradient-to-r from-rose-600 to-red-500',
    textClass: 'text-rose-700 dark:text-rose-400',
    badgeClass: 'bg-rose-50 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300'
  }
}

export default function RatingExtremesCard({ rows }) {
  const list = Array.isArray(rows) ? rows : []
  const last = [...list].reverse().find((r) => isNum(r?.rating5Pct) || isNum(r?.rating1Pct) || isNum(r?.score))

  if (!last) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-xs font-semibold text-slate-400">
        No rating distribution data
      </div>
    )
  }

  const r5 = isNum(last.rating5Pct) ? last.rating5Pct : null
  const r4 = isNum(last.rating4Pct) ? last.rating4Pct : null
  const r3 = isNum(last.rating3Pct) ? last.rating3Pct : null
  const r2 = isNum(last.rating2Pct) ? last.rating2Pct : null
  const r1 = isNum(last.rating1Pct) ? last.rating1Pct : null

  if (r5 === null && r4 === null && r3 === null && r2 === null && r1 === null) {
    return (
      <div className="flex h-full min-h-[220px] items-center justify-center text-xs font-semibold text-slate-400">
        No rating distribution data
      </div>
    )
  }

  const ratings = [
    { star: 5, pct: r5 ?? 0 },
    { star: 4, pct: r4 ?? 0 },
    { star: 3, pct: r3 ?? 0 },
    { star: 2, pct: r2 ?? 0 },
    { star: 1, pct: r1 ?? 0 }
  ]

  return (
    <div className="flex h-full flex-col justify-between gap-3 py-1">
      <div className="flex items-center justify-between border-b border-slate-200/80 pb-2 dark:border-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Rating Breakdown
        </span>
        <span className="rounded-md bg-slate-200/70 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
          Latest Month: {last.period}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-around gap-2.5">
        {ratings.map((item) => {
          const cfg = RATING_GRADIENTS[item.star]
          return (
            <div key={item.star} className="group">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <span className="flex items-center text-amber-500">
                    <Star size={13} className="fill-amber-400 stroke-amber-500" />
                  </span>
                  <span>{cfg.label}</span>
                </span>
                <span className={`tabular-nums font-black ${cfg.textClass}`}>
                  {item.pct.toFixed(1)}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-200/90 p-[1px] dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out shadow-xs ${cfg.barClass}`}
                  style={{ width: `${Math.min(100, Math.max(0, item.pct))}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {isNum(last.score) && (
        <div className="mt-1 flex items-center justify-between rounded-xl bg-slate-200/60 px-3 py-2 text-xs font-semibold dark:bg-slate-800/60">
          <span className="text-slate-600 dark:text-slate-400">Average CSAT Score</span>
          <span className="font-black tabular-nums text-slate-900 dark:text-slate-100">
            {last.score.toFixed(2)} / 5.0
          </span>
        </div>
      )}
    </div>
  )
}

