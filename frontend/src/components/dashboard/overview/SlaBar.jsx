import { motion, useReducedMotion } from 'framer-motion'
import { isNum } from '../shared/kpiHelpers'

export default function SlaBar({ value, sla, triggerKey }) {
    const reduce = useReducedMotion()

    if (!isNum(value) || !isNum(sla) || sla <= 0) return null

    const max = 16
    const fillPct = Math.min(100, Math.max(0, (value / max) * 100))
    const slaPct = (sla / max) * 100
    const midPct = (8 / max) * 100
    const over = value > sla
    const diff = Math.abs(value - sla).toFixed(2)
    const ariaLabel = `Average delivery ${value.toFixed(2)} days against a target of ${sla} days, ${over ? `${diff} days over` : 'within target'}`

    return (
        <div role="img" aria-label={ariaLabel} className="w-full">
            <div className="relative h-2.5 w-full rounded-full bg-slate-200/90 dark:bg-slate-800">
                <motion.div
                    key={triggerKey}
                    className={`h-full rounded-full ${over ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    initial={reduce ? false : { width: 0 }}
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                />
                <span
                    aria-hidden="true"
                    className="absolute -bottom-1 -top-1 w-0.5 rounded-full bg-slate-900 dark:bg-slate-100"
                    style={{ left: `${slaPct}%` }}
                />
            </div>
            <div className="relative mt-2 h-4 text-[10px] font-bold tabular-nums text-slate-400 dark:text-slate-500">
                <span className="absolute left-0">0d</span>
                <span
                    className="absolute -translate-x-1/2 text-slate-400 dark:text-slate-500"
                    style={{ left: `${midPct}%` }}
                >
                    8d
                </span>
                <span
                    className="absolute -translate-x-1/2 whitespace-nowrap font-extrabold text-slate-800 dark:text-slate-200"
                    style={{ left: `${slaPct}%` }}
                >
                    Target {sla}d
                </span>
                <span className="absolute right-0">16d</span>
            </div>
        </div>
    )
}
