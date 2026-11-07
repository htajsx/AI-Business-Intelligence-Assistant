import AnimatedCounter from './AnimatedCounter'
import { DeltaLine } from './DeltaPill'
import { card, focusRing } from '../../../utils/ui'
import { isNum } from '../shared/kpiHelpers'

export default function KpiMetricCard({
    slotKey,
    kpi,
    lowerIsBetter = false,
    triggerKey,
    comparisonAvailable = true,
    comparison = null
}) {
    const hasValue = isNum(kpi?.value)

    return (
        <div
            data-kpi-id={slotKey}
            role="region"
            aria-label={kpi?.label || slotKey}
            tabIndex={0}
            className={`relative flex h-full min-h-[190px] scroll-mt-28 flex-col justify-between overflow-hidden rounded-2xl p-6 transition-all duration-200 sm:p-7 ${card} ${focusRing}`}
        >
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100">
                    {kpi?.label || slotKey}
                </h3>
            </div>

            <div className="my-auto py-3">
                {hasValue ? (
                    <div className="break-words text-4xl font-extrabold leading-none tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl">
                        <AnimatedCounter value={kpi.value} format={kpi.format} triggerKey={triggerKey} />
                    </div>
                ) : (
                    <div className="py-2 text-sm font-semibold text-slate-400">No data available</div>
                )}
            </div>

            <div className="pt-2 min-h-[24px]">
                <DeltaLine
                    delta={kpi?.delta}
                    deltaLabel={kpi?.deltaLabel}
                    comparison={comparison}
                    comparisonAvailable={comparisonAvailable}
                    lowerIsBetter={lowerIsBetter}
                />
            </div>
        </div>
    )
}
