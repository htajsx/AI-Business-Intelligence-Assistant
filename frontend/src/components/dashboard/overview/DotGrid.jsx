import { motion, useReducedMotion } from 'framer-motion'
import { isNum } from '../shared/kpiHelpers'

const TOTAL = 100
const COLS = 25
const DOTS = Array.from({ length: TOTAL }, (_, i) => i)

export default function DotGrid({ value, triggerKey, compact = false }) {
    const reduce = useReducedMotion()

    if (!isNum(value)) return null

    const lit = value > 0 ? Math.min(TOTAL, Math.max(1, Math.round(value))) : 0
    const n = value > 0 ? Math.max(1, Math.round(100 / value)) : 0
    const caption = n > 0 ? `≈ 1 in ${n} customers buys again` : null

    if (compact) {
        const dotCount = Math.min(28, Math.max(6, n || 15))
        const singleDots = Array.from({ length: dotCount }, (_, i) => i)
        return (
            <div
                key={triggerKey}
                role="img"
                aria-label={`1 in ${n} customers buys again`}
                className="flex items-center gap-1 w-full overflow-hidden py-1"
            >
                {singleDots.map((i) =>
                    i === 0 ? (
                        <motion.span
                            key={i}
                            className="h-2 w-2 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0"
                            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3 }}
                        />
                    ) : (
                        <span
                            key={i}
                            className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0"
                        />
                    )
                )}
            </div>
        )
    }

    const ariaLabel = `${lit} of ${TOTAL} dots lit${caption ? `, ${caption}` : ''}`

    return (
        <div className="w-full">
            <div
                key={triggerKey}
                role="img"
                aria-label={ariaLabel}
                className="grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            >
                {DOTS.map((i) =>
                    i < lit ? (
                        <motion.span
                            key={i}
                            className="aspect-square rounded-full bg-indigo-500 dark:bg-indigo-400"
                            initial={reduce ? false : { opacity: 0, scale: 0.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.012 }}
                        />
                    ) : (
                        <span
                            key={i}
                            className="aspect-square rounded-full bg-slate-200 dark:bg-slate-800"
                        />
                    )
                )}
            </div>
            {caption && (
                <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">{caption}</p>
            )}
        </div>
    )
}
