import AnimatedCounter from './AnimatedCounter'
import DeltaPill from './DeltaPill'
import { TrendUpTriangle, TrendDownTriangle } from './TrendTriangles'
import { focusRing } from '../../../utils/ui'
import { isNum, formatKpiValue, periodTextOf } from '../shared/kpiHelpers'

export default function KpiHeroCard({ kpi, momKpi, triggerKey, comparisonAvailable = true, comparison = null }) {
    const hasValue = isNum(kpi?.value)
    const hasMom = comparisonAvailable && Boolean(momKpi) && isNum(momKpi.value)
    const momUp = hasMom && momKpi.value >= 0
    const MomIcon = momUp ? TrendUpTriangle : TrendDownTriangle
    const momText = hasMom
        ? `${momKpi.value > 0 ? '+' : ''}${formatKpiValue(momKpi.value, momKpi.format)}`
        : ''

    return (
        <div
            data-kpi-id="revenue"
            role="region"
            aria-label={kpi?.label || 'Net Revenue'}
            tabIndex={0}
            className={`relative flex h-full min-h-[190px] scroll-mt-28 flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-[#590907] via-[#7A1F1A] to-[#2A0403] p-6 text-white shadow-[0_2px_4px_rgba(0,0,0,0.4),0_7px_13px_-3px_rgba(0,0,0,0.3),inset_0_-3px_0_rgba(0,0,0,0.2)] transition-all duration-200 sm:p-7 ${focusRing}`}
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">
                        {kpi?.label || 'Net Revenue'}
                    </h3>
                    <span
                        title="Exact SQL: SUM(oi.price) FROM orders o JOIN order_items oi WHERE o.order_status = 'delivered'"
                        className="cursor-help rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200 hover:bg-white/20 transition-colors"
                    >
                        SQL
                    </span>
                </div>
                {hasMom ? (
                    <div className="flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1 backdrop-blur-xs">
                        <span className="text-[11px] font-semibold tracking-wide text-indigo-200">
                            Revenue growth
                        </span>
                        <span
                            className={`inline-flex items-center gap-1 text-xs font-black tabular-nums ${momUp ? 'text-emerald-300' : 'text-rose-300'
                                }`}
                        >
                            <MomIcon size={12} />
                            {momText}
                        </span>
                    </div>
                ) : (
                    <div className="min-h-[28px]" aria-hidden="true" />
                )}
            </div>

            <div className="my-auto py-2">
                {hasValue ? (
                    <div className="break-words text-4xl font-black leading-none tracking-tight text-white sm:text-5xl lg:text-[52px]">
                        <AnimatedCounter value={kpi.value} format={kpi.format} triggerKey={triggerKey} />
                    </div>
                ) : (
                    <div className="text-sm font-semibold text-indigo-200/80">No data available</div>
                )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 min-h-[24px]">
                {comparisonAvailable && isNum(kpi?.delta) ? (
                    <div className="flex items-center gap-2">
                        <DeltaPill delta={kpi.delta} onDark />
                        <span className="text-xs font-semibold text-indigo-100/90">
                            {periodTextOf(kpi.deltaLabel, comparison)}
                        </span>
                    </div>
                ) : (
                    <div className="min-h-[24px]" aria-hidden="true" />
                )}
            </div>
        </div>
    )
}