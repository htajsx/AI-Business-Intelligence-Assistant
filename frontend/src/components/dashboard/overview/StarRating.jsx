import { useId } from 'react'
import { isNum } from '../shared/kpiHelpers'

const STAR_POINTS = '12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26'
const INDEXES = [0, 1, 2, 3, 4]

export default function StarRating({ value, max = 5, size = 20 }) {
    const uid = useId().replace(/:/g, '')

    if (!isNum(value)) return null

    const clamped = Math.min(max, Math.max(0, value))

    return (
        <div
            role="img"
            aria-label={`Rated ${clamped.toFixed(2)} out of ${max}`}
            className="flex items-center gap-0.5"
        >
            {INDEXES.map((i) => {
                const fraction = Math.min(1, Math.max(0, clamped - i))
                const gradId = `star-${uid}-${i}`
                return (
                    <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
                        <defs>
                            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                                <stop offset={fraction} stopColor="#B7832A" />
                                <stop offset={fraction} stopColor="#B7832A" stopOpacity="0" />
                            </linearGradient>
                        </defs>
                        <polygon
                            points={STAR_POINTS}
                            fill="currentColor"
                            strokeLinejoin="round"
                            className="text-slate-200 dark:text-slate-700"
                        />
                        <polygon points={STAR_POINTS} fill={`url(#${gradId})`} strokeLinejoin="round" />
                    </svg>
                )
            })}
        </div>
    )
}