import { useState, useMemo } from 'react'
import { Sparkles } from 'lucide-react'
import { formatValue, formatInt } from '../../../utils/format'
import { humanizeLabel } from '../../../utils/labels'
import { card, focusRing, iconBtn } from '../../../utils/ui'

export default function RankingsAndAnalytics({
  categories = [],
  states = [],
  bottomPerformers = [],
  anomalies = [],
  periodComparison = [],
  comparisonAvailable = true,
  onAsk
}) {
  const [activeTab, setActiveTab] = useState('rankings')

  const groupedAnomalies = useMemo(() => {
    if (!Array.isArray(anomalies) || anomalies.length === 0) return []
    const sorted = [...anomalies].sort((a, b) => new Date(a.date) - new Date(b.date))
    const groups = []
    let currentGroup = []

    for (const ano of sorted) {
      if (currentGroup.length === 0) {
        currentGroup.push(ano)
      } else {
        const last = currentGroup[currentGroup.length - 1]
        const lastDate = new Date(last.date)
        const currDate = new Date(ano.date)
        const diffDays = Math.round((currDate - lastDate) / (1000 * 60 * 60 * 24))
        const sameDir = (ano.zScore >= 0 && last.zScore >= 0) || (ano.zScore < 0 && last.zScore < 0)

        if (diffDays === 1 && sameDir) {
          currentGroup.push(ano)
        } else {
          groups.push(currentGroup)
          currentGroup = [ano]
        }
      }
    }
    if (currentGroup.length > 0) {
      groups.push(currentGroup)
    }

    return groups.map((grp) => {
      const peak = [...grp].sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))[0]
      const isSpike = peak.zScore > 0 || peak.direction === 'spike'
      const duration = grp.length === 1
        ? '1 day'
        : `${grp.length} consecutive days (${grp[0].date} – ${grp[grp.length - 1].date})`
      return {
        id: peak.id || `ano-group-${grp[0].date}`,
        date: grp.length === 1 ? peak.date : `${grp[0].date} – ${grp[grp.length - 1].date}`,
        peakDate: peak.date,
        duration,
        count: grp.length,
        isSpike,
        title: isSpike ? 'Daily Orders Volume Spike' : 'Daily Orders Volume Drop',
        zScore: peak.zScore,
        value: peak.value,
        baseline: peak.baseline,
        impact: peak.impact,
        severity: peak.severity,
      }
    })
  }, [anomalies])

  const tabs = [
    { id: 'rankings', label: 'Top Performers', count: categories.length },
    { id: 'bottom', label: 'Bottlenecks & Underperformers', count: bottomPerformers.length },
    { id: 'anomalies', label: 'Anomaly Detection', count: groupedAnomalies.length },
    ...(comparisonAvailable
      ? [{ id: 'comparison', label: 'Period-over-Period Delta', count: periodComparison.length }]
      : [])
  ]

  const currentTab = tabs.some((t) => t.id === activeTab) ? activeTab : 'rankings'

  return (
    <div>
      <div className={`overflow-hidden rounded-2xl p-5 sm:p-6 ${card}`}>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div
            role="tablist"
            aria-label="Analytics views"
            className="thin-scroll flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1.5 dark:bg-slate-800/90"
          >
            {tabs.map((tab) => {
              const isActive = currentTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold transition-all duration-200 ${isActive
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                      : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-700/40 dark:hover:text-slate-200'
                    } ${focusRing}`}
                >
                  <span>{tab.label}</span>
                  {typeof tab.count === 'number' && tab.count > 0 && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-black ${isActive
                          ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                          : 'bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-5">
          {currentTab === 'rankings' && (
            <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-2">
              <div className="flex flex-col justify-between h-full rounded-xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur-xs dark:border-slate-800/60 dark:bg-slate-900/60">
                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Top Product Verticals
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Share of Sales</span>
                  </div>

                  {categories.length > 0 ? (
                    <div className="thin-scroll overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-400 dark:border-slate-800">
                            <th className="w-8 pb-2 text-center">#</th>
                            <th className="pb-2">Category</th>
                            <th className="pb-2 text-right">Revenue</th>
                            <th className="pb-2 text-right">Orders</th>
                            <th className="pb-2 text-right">Share</th>
                            {comparisonAvailable && <th className="pb-2 text-right">MoM</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {categories.slice(0, 6).map((cat, idx) => (
                            <tr key={cat.category} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                              <td className="py-2.5 text-center">
                                <span
                                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${idx === 0
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                                      : idx === 1
                                        ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                                        : idx === 2
                                          ? 'bg-amber-200/50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-400'
                                          : 'font-semibold text-slate-400'
                                    }`}
                                >
                                  {cat.rank || idx + 1}
                                </span>
                              </td>
                              <td className="py-2.5 font-bold text-slate-800 dark:text-slate-100">
                                {humanizeLabel(cat.category)}
                              </td>
                              <td className="py-2.5 text-right font-black tabular-nums text-slate-900 dark:text-slate-50">
                                {formatValue(cat.revenue, 'currency')}
                              </td>
                              <td className="py-2.5 text-right font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                                {formatInt(cat.orders)}
                              </td>
                              <td className="py-2.5 text-right tabular-nums">
                                <span className="inline-block rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                                  {cat.share}%
                                </span>
                              </td>
                              {comparisonAvailable && (
                                <td className="py-2.5 text-right font-black tabular-nums">
                                  {cat.growth !== null && cat.growth !== undefined ? (
                                    <span className={cat.growth >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}>
                                      {cat.growth > 0 ? `+${cat.growth}%` : `${cat.growth}%`}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 font-normal">—</span>
                                  )}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center text-xs font-semibold text-slate-400">
                      No category ranking data available
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col justify-between h-full rounded-xl border border-slate-200/60 bg-white/70 p-4 shadow-sm backdrop-blur-xs dark:border-slate-800/60 dark:bg-slate-900/60">
                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200/60 pb-2 dark:border-slate-800/60">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                      Top Regional Markets (States)
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Fulfillment SLA</span>
                  </div>

                  {states.length > 0 ? (
                    <div className="thin-scroll overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-400 dark:border-slate-800">
                            <th className="pb-2">State</th>
                            <th className="pb-2 text-right">Orders</th>
                            <th className="pb-2 text-right">Revenue</th>
                            <th className="pb-2 text-right">Transit Days</th>
                            <th className="pb-2 text-right">SLA Health</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {states.slice(0, 6).map((st) => (
                            <tr key={st.state} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                              <td className="py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-5 w-7 items-center justify-center rounded bg-slate-200 text-[10px] font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                    {st.state}
                                  </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-100">
                                    {st.name}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 text-right font-semibold tabular-nums text-slate-600 dark:text-slate-300">
                                {formatInt(st.orders)}
                              </td>
                              <td className="py-2.5 text-right font-black tabular-nums text-slate-900 dark:text-slate-50">
                                {formatValue(st.revenue, 'currency')}
                              </td>
                              <td className="py-2.5 text-right font-bold tabular-nums">
                                <span className={st.avgDays <= 12 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                                  {st.avgDays}d
                                </span>
                              </td>
                              <td className="py-2.5 text-right tabular-nums">
                                <span
                                  className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${st.status === 'Optimal'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                      : st.status === 'Warning'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                    }`}
                                >
                                  {st.slaRate}% · {st.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex h-36 items-center justify-center text-xs font-semibold text-slate-400">
                      No state ranking data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentTab === 'bottom' && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Categories and states with the weakest delivery and cancellation performance.
              </p>
              {bottomPerformers.length > 0 ? (
                <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {bottomPerformers.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col justify-between h-full rounded-xl border border-rose-200/80 bg-rose-50/30 p-5 shadow-xs transition-all hover:shadow-md dark:border-rose-900/40 dark:bg-rose-950/20"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-black text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.type}
                          </span>
                          <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-rose-800 dark:bg-rose-900/50 dark:text-rose-300">
                            {item.alert}
                          </span>
                        </div>
                        <h4 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-slate-50">
                          {humanizeLabel(item.name)}
                        </h4>
                        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-rose-50/70 p-2 text-xs font-bold dark:bg-rose-950/20">
                          <span className="text-slate-600 dark:text-slate-400">{item.metric}:</span>
                          <span className="tabular-nums text-rose-600 dark:text-rose-400">
                            {item.value} <span className="text-[10px] text-slate-500">(vs {item.benchmark})</span>
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 border-t border-slate-200/60 pt-2.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-400">
                        {item.note}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center text-xs font-semibold text-slate-400">
                  No bottleneck data available
                </div>
              )}
            </div>
          )}

          {currentTab === 'anomalies' && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Days that deviate from the trailing 28-day baseline.
              </p>
              {groupedAnomalies.length > 0 ? (
                <div className="grid grid-cols-1 items-stretch gap-4 sm:grid-cols-2">
                  {groupedAnomalies.map((ano) => (
                    <div
                      key={ano.id}
                      className={`flex flex-col justify-between h-full rounded-xl border p-5 shadow-xs transition-all hover:shadow-md ${ano.isSpike
                          ? 'border-emerald-200/80 bg-emerald-50/20 dark:border-emerald-900/40 dark:bg-emerald-950/10'
                          : 'border-rose-200/80 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/10'
                        }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`rounded-md px-2 py-0.5 text-[11px] font-black ${ano.isSpike
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                              }`}>
                              z = {ano.zScore > 0 ? `+${ano.zScore}` : ano.zScore}
                            </span>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {ano.date}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${ano.isSpike
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                }`}
                            >
                              {ano.isSpike ? 'Opportunity' : 'Risk'}
                            </span>
                            {onAsk && (
                              <button
                                type="button"
                                title="Ask AI about this anomaly"
                                aria-label="Ask AI about this anomaly"
                                onClick={() => onAsk(`What caused the anomaly on ${ano.peakDate || ano.date} (${ano.title})?`)}
                                className={`${iconBtn} text-indigo-500 dark:text-indigo-300`}
                              >
                                <Sparkles size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        <h4 className="mt-3 text-sm font-extrabold text-slate-900 dark:text-slate-50">
                          {ano.title}
                        </h4>
                        <div className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Duration: <strong className="font-semibold text-slate-700 dark:text-slate-300">{ano.duration}</strong>
                        </div>
                        <div className="mt-2.5 flex items-center justify-between rounded-lg bg-slate-100/80 p-2 text-xs font-semibold dark:bg-slate-800/60">
                          <span className="text-slate-600 dark:text-slate-400">
                            Peak Measured: <strong className="font-extrabold text-slate-900 dark:text-slate-100">{ano.value}</strong>
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            Baseline: <strong className="font-bold">{ano.baseline}</strong>
                          </span>
                        </div>
                      </div>
                      <p className="mt-3 border-t border-slate-200/60 pt-2.5 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
                        {ano.impact}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center text-xs font-semibold text-slate-400">
                  No statistical anomalies detected for this period
                </div>
              )}
            </div>
          )}

          {currentTab === 'comparison' && comparisonAvailable && (
            <div className="thin-scroll overflow-x-auto rounded-xl border border-slate-200/60 bg-white/70 p-4 shadow-sm dark:border-slate-800/60 dark:bg-slate-900/60">
              {periodComparison.length > 0 ? (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/80 text-[11px] font-bold uppercase text-slate-400 dark:border-slate-800">
                      <th className="pb-3">Key Metric</th>
                      <th className="pb-3 text-right">Current Period</th>
                      <th className="pb-3 text-right">Previous Benchmark</th>
                      <th className="pb-3 text-right">Absolute Delta</th>
                      <th className="pb-3 text-right">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {periodComparison.map((row) => (
                      <tr key={row.metric} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                        <td className="py-3.5 font-bold text-slate-800 dark:text-slate-100">
                          {row.metric}
                        </td>
                        <td className="py-3.5 text-right font-black tabular-nums text-slate-900 dark:text-slate-50">
                          {row.current}
                        </td>
                        <td className="py-3.5 text-right font-medium tabular-nums text-slate-500 dark:text-slate-400">
                          {row.previous}
                        </td>
                        <td className="py-3.5 text-right font-bold tabular-nums">
                          <span className={row.isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                            {row.change}
                          </span>
                        </td>
                        <td className="py-3.5 text-right tabular-nums">
                          <span
                            className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-black ${row.isPositive
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300'
                              }`}
                          >
                            {row.pct}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="flex h-36 items-center justify-center text-xs font-semibold text-slate-400">
                  No period comparison data available
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}