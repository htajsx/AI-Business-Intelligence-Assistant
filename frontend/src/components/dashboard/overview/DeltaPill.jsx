import { Minus } from 'lucide-react'
import { TrendUpTriangle, TrendDownTriangle } from './TrendTriangles'
import { getTone, formatDeltaText, periodTextOf, isNum } from '../shared/kpiHelpers'

const LIGHT = {
    good: 'bg-[#E0E8D2] text-[#567340] dark:bg-emerald-500/20 dark:text-emerald-300',
    bad: 'bg-[#F3DCD6] text-[#6E1512] dark:bg-rose-500/20 dark:text-rose-300',
    neutral: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
}

const HERO = {
    good: 'bg-[#E0E8D2] text-[#445B34]',
    bad: 'bg-rose-100 text-rose-700',
    neutral: 'bg-white/15 text-indigo-100'
}

export default function DeltaPill({
    delta,
    lowerIsBetter = false,
    unit = '%',
    digits = 1,
    onDark = false
}) {
    if (!isNum(delta)) return null
    const tone = getTone(delta, lowerIsBetter)
    const Icon = delta > 0 ? TrendUpTriangle : delta < 0 ? TrendDownTriangle : Minus
    const palette = onDark ? HERO : LIGHT
    return (
        <span
            className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${palette[tone]}`}
        >
            <Icon size={12} aria-hidden="true" />
            {formatDeltaText(delta, unit, digits)}
        </span>
    )
}

export function DeltaLine({
    delta,
    deltaLabel,
    comparison,
    comparisonAvailable = true,
    lowerIsBetter = false,
    unit = '%',
    digits = 1,
    onDark = false
}) {
    const muted = onDark ? 'text-indigo-100/80' : 'text-slate-500 dark:text-slate-400'

    if (!comparisonAvailable || !isNum(delta)) {
        return <div className="min-h-[20px]" aria-hidden="true" />
    }

    return (
        <div className="flex flex-wrap items-center gap-1.5 min-h-[20px]">
            <DeltaPill
                delta={delta}
                lowerIsBetter={lowerIsBetter}
                unit={unit}
                digits={digits}
                onDark={onDark}
            />
            <span className={`whitespace-nowrap text-xs font-normal ${muted}`}>
                {periodTextOf(deltaLabel, comparison)}
            </span>
        </div>
    )
}
