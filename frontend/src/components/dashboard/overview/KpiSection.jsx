import { useMemo } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import AnimatedCounter from './AnimatedCounter'
import KpiHeroCard from './KpiHeroCard'
import KpiMetricCard from './KpiMetricCard'
import { KpiPanel, KpiPanelTile } from './KpiPanel'
import DeltaPill from './DeltaPill'
import SlaBar from './SlaBar'
import StarRating from './StarRating'
import DotGrid from './DotGrid'
import {
    SLA_DAYS,
    isNum
} from '../shared/kpiHelpers'

export const KPI_SLOTS = {
    revenue: { ids: ['revenue'], labels: [] },
    orders: { ids: ['orders'], labels: [] },
    deliveryTime: { ids: ['delivery_time'], labels: [] },
    cancel: { ids: ['cancel'], labels: [] },
    aov: { ids: ['aov'], labels: ['average order', 'avg order', 'aov'] },
    momGrowth: { ids: ['mom_growth'], labels: ['growth'] },
    onTime: { ids: ['on_time'], labels: ['on-time', 'on time', 'ontime'] },
    deliveryScore: { ids: ['fulfillment_health', 'delivery_score'], labels: ['performance score', 'delivery score'] },
    review: { ids: ['review'], labels: ['review'] },
    repeat: { ids: ['repeat_rate', 'repeat'], labels: ['repeat'] }
}

const BIG_NUMBER =
    'text-2xl sm:text-3xl font-black tabular-nums text-slate-900 dark:text-slate-50'

function PlainWrapper({ children, className = '' }) {
    return <div className={className}>{children}</div>
}

function resolveSlots(kpis) {
    const list = Array.isArray(kpis) ? kpis : []
    const used = new Set()
    const result = {}

    Object.entries(KPI_SLOTS).forEach(([slot, rule]) => {
        let found = list.find((k) => k && !used.has(k) && rule.ids.includes(k.id))

        if (!found && rule.labels.length > 0) {
            found = list.find((k) => {
                if (!k || used.has(k)) return false
                const text = String(k.label ?? '').toLowerCase()
                return rule.labels.some((term) => text.includes(term))
            })
        }

        if (found) {
            used.add(found)
            result[slot] = found
        }
    })

    return result
}

function CancellationSparkline({ series = [] }) {
    const points = (Array.isArray(series) ? series : [])
        .map((r) => r.cancelRate ?? r.cancel_rate ?? r.value)
        .filter(isNum)
    if (points.length < 2) {
        return <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded" />
    }
    const min = Math.min(...points)
    const max = Math.max(...points)
    const span = max - min || 1
    const width = 140
    const height = 22
    const path = points
        .map((p, i) => {
            const x = (i / (points.length - 1)) * width
            const y = height - ((p - min) / span) * (height - 4) - 2
            return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
        })
        .join(' ')
    return (
        <svg className="w-full h-5 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
            <path d={path} fill="none" stroke="#8E2F2B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

export default function KpiSection({ data, triggerKey, scrollRoot, Wrapper = PlainWrapper }) {
    const slots = useMemo(() => resolveSlots(data?.kpis), [data])
    const comparisonAvailable = Boolean(data?.meta?.comparisonAvailable)
    const comparison = data?.meta?.comparison || null

    const { revenue, orders, aov, momGrowth, onTime, deliveryTime, cancel, review, repeat } =
        slots

    const hasPrimary = Boolean(revenue || orders || aov)
    const deliveryCount = [onTime, deliveryTime, cancel].filter(Boolean).length
    const customerCount = [review, repeat].filter(Boolean).length

    const deliveryOver = Boolean(deliveryTime) && isNum(deliveryTime.value) && deliveryTime.value > SLA_DAYS
    const repeatN = repeat && isNum(repeat.value) && repeat.value > 0 ? Math.max(1, Math.round(100 / repeat.value)) : 29

    return (
        <div className="space-y-4">
            {hasPrimary ? (
                <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-12">
                    {revenue && (
                        <Wrapper scrollRoot={scrollRoot} className="md:col-span-2 lg:col-span-6 flex flex-col h-full">
                            <KpiHeroCard
                                kpi={revenue}
                                momKpi={momGrowth}
                                triggerKey={`revenue-${triggerKey}`}
                                comparisonAvailable={comparisonAvailable}
                                comparison={comparison}
                            />
                        </Wrapper>
                    )}
                    {orders && (
                        <Wrapper scrollRoot={scrollRoot} className="lg:col-span-3 flex flex-col h-full" delay={0.04}>
                            <KpiMetricCard
                                slotKey="orders"
                                kpi={orders}
                                triggerKey={`orders-${triggerKey}`}
                                comparisonAvailable={comparisonAvailable}
                                comparison={comparison}
                            />
                        </Wrapper>
                    )}
                    {aov && (
                        <Wrapper scrollRoot={scrollRoot} className="lg:col-span-3 flex flex-col h-full" delay={0.08}>
                            <KpiMetricCard
                                slotKey="aov"
                                kpi={aov}
                                triggerKey={`aov-${triggerKey}`}
                                comparisonAvailable={comparisonAvailable}
                                comparison={comparison}
                            />
                        </Wrapper>
                    )}
                </div>
            ) : (
                <div className="flex h-36 flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    <span>No primary KPI data available</span>
                    <span className="text-[11px] text-slate-400/80">Check backend server connectivity</span>
                </div>
            )}

            {deliveryCount + customerCount > 0 ? (
                <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-5">
                    {deliveryCount > 0 && (
                        <Wrapper scrollRoot={scrollRoot} className="lg:col-span-3 flex flex-col h-full">
                            <KpiPanel
                                title="Delivery & Operations"
                                subtitle="Fulfilment quality against targets"
                                bodyClassName="grid grid-cols-1 divide-y md:grid-cols-3 md:divide-x md:divide-y-0"
                            >
                                {onTime && (
                                    <KpiPanelTile kpiId="onTime" label={onTime.label}>
                                        <div className="h-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                            {onTime.label}
                                        </div>
                                        <div className="h-9 flex items-baseline justify-between gap-2">
                                            <span className={BIG_NUMBER}>
                                                <AnimatedCounter
                                                    value={onTime.value}
                                                    format={onTime.format}
                                                    triggerKey={`onTime-${triggerKey}`}
                                                />
                                            </span>
                                            {comparisonAvailable && isNum(onTime.delta) ? (
                                                <DeltaPill delta={onTime.delta} />
                                            ) : null}
                                        </div>
                                        <div className="h-5 flex items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                            of delivered orders arrived by the promised date
                                        </div>
                                        <div className="h-7 flex items-center">
                                            <div className="w-full h-2 rounded-full bg-slate-200/90 dark:bg-slate-800 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-indigo-500 transition-all duration-700 ease-out"
                                                    style={{ width: `${Math.min(100, Math.max(0, onTime.value || 0))}%` }}
                                                />
                                            </div>
                                        </div>
                                    </KpiPanelTile>
                                )}

                                {deliveryTime && (
                                    <KpiPanelTile kpiId="deliveryTime" label={deliveryTime.label}>
                                        <div className="h-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                            {deliveryTime.label}
                                        </div>
                                        <div className="h-9 flex items-baseline justify-between gap-2">
                                            <span className={BIG_NUMBER}>
                                                <AnimatedCounter
                                                    value={deliveryTime.value}
                                                    format={deliveryTime.format}
                                                    triggerKey={`deliveryTime-${triggerKey}`}
                                                />
                                            </span>
                                            {comparisonAvailable && isNum(deliveryTime.delta) ? (
                                                <DeltaPill delta={deliveryTime.delta} lowerIsBetter />
                                            ) : null}
                                        </div>
                                        <div className="h-5 flex items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                            {isNum(deliveryTime.value) && (
                                                deliveryOver ? (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                                                        <AlertTriangle size={11} aria-hidden="true" />
                                                        +{(deliveryTime.value - SLA_DAYS).toFixed(1)}d over target
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                                        <CheckCircle2 size={11} aria-hidden="true" />
                                                        Within 12d target
                                                    </span>
                                                )
                                            )}
                                        </div>
                                        <div className="h-7 flex items-center">
                                            <div className="w-full">
                                                <SlaBar
                                                    value={deliveryTime.value}
                                                    sla={SLA_DAYS}
                                                    triggerKey={`sla-${triggerKey}`}
                                                />
                                            </div>
                                        </div>
                                    </KpiPanelTile>
                                )}

                                {cancel && (
                                    <KpiPanelTile kpiId="cancel" label={cancel.label}>
                                        <div className="h-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                            {cancel.label}
                                        </div>
                                        <div className="h-9 flex items-baseline justify-between gap-2">
                                            <span className={BIG_NUMBER}>
                                                <AnimatedCounter
                                                    value={cancel.value}
                                                    format={cancel.format}
                                                    triggerKey={`cancel-${triggerKey}`}
                                                />
                                            </span>
                                            {comparisonAvailable && isNum(cancel.delta) ? (
                                                <DeltaPill delta={cancel.delta} lowerIsBetter digits={2} />
                                            ) : null}
                                        </div>
                                        <div className="h-5 flex items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                            {cancel.canceledCount
                                                ? `${cancel.canceledCount.toLocaleString('en-US')} canceled orders`
                                                : 'of all orders'}
                                        </div>
                                        <div className="h-7 flex items-center">
                                            <CancellationSparkline series={data?.series?.cancellation_trend} />
                                        </div>
                                    </KpiPanelTile>
                                )}
                            </KpiPanel>
                        </Wrapper>
                    )}

                    {customerCount > 0 && (
                        <Wrapper scrollRoot={scrollRoot} className="lg:col-span-2 flex flex-col h-full" delay={0.04}>
                            <KpiPanel
                                title="Customer"
                                subtitle="Satisfaction & loyalty"
                                bodyClassName="grid grid-cols-1 divide-y md:grid-cols-2 md:divide-x md:divide-y-0"
                            >
                                {review && (
                                    <KpiPanelTile kpiId="review" label={review.label}>
                                        <div className="h-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                            {review.label}
                                        </div>
                                        <div className="h-9 flex items-baseline justify-between gap-2">
                                            <div className="flex items-baseline gap-1 text-2xl sm:text-3xl font-black tabular-nums text-slate-900 dark:text-slate-50">
                                                <AnimatedCounter
                                                    value={review.value}
                                                    format={review.format}
                                                    triggerKey={`review-${triggerKey}`}
                                                />
                                                <span className="text-sm font-semibold text-slate-400">/ 5</span>
                                            </div>
                                            {comparisonAvailable && isNum(review.delta) ? (
                                                <DeltaPill delta={review.delta} unit="" digits={2} />
                                            ) : null}
                                        </div>
                                        <div className="h-5 flex items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                            {review.reviewCount
                                                ? `${review.reviewCount.toLocaleString('en-US')} verified reviews`
                                                : <span className="text-slate-400">customer review average</span>}
                                        </div>
                                        <div className="h-7 flex items-center">
                                            <StarRating value={review.value} size={16} />
                                        </div>
                                    </KpiPanelTile>
                                )}

                                {repeat && (
                                    <KpiPanelTile kpiId="repeat" label={repeat.label}>
                                        <div className="h-5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider truncate">
                                            {repeat.label}
                                        </div>
                                        <div className="h-9 flex items-baseline justify-between gap-2">
                                            <span className={BIG_NUMBER}>
                                                <AnimatedCounter
                                                    value={repeat.value}
                                                    format={repeat.format}
                                                    triggerKey={`repeat-${triggerKey}`}
                                                />
                                            </span>
                                            {comparisonAvailable && isNum(repeat.delta) ? (
                                                <DeltaPill delta={repeat.delta} digits={2} />
                                            ) : null}
                                        </div>
                                        <div className="h-5 flex items-center text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                                            {`≈ 1 in ${repeatN} customers buys again`}
                                        </div>
                                        <div className="h-7 flex items-center">
                                            <DotGrid value={repeat.value} triggerKey={`dots-${triggerKey}`} compact />
                                        </div>
                                    </KpiPanelTile>
                                )}
                            </KpiPanel>
                        </Wrapper>
                    )}
                </div>
            ) : (
                <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-xs font-semibold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
                    <span>No secondary KPI metrics available (Backend offline)</span>
                </div>
            )}
        </div>
    )
}
