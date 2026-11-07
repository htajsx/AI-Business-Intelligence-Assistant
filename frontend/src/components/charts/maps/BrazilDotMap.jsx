import { memo, useId, useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { formatCurrency, formatInt, isNum } from '../../../utils/format'
import {
  MAP_WIDTH,
  MAP_HEIGHT,
  OTHERS_COLOR,
  buildArcPath,
  buildLegend,
  getMapModel,
  getTierColor,
  sanitizeRows
} from '../../../utils/brazilMap'

const SHOW_ARCS = true
const HOTSPOT_COUNT = 8
const ARC_COUNT = 4
const DOT_RADIUS = 1.9

const StateDots = memo(function StateDots({ code, outline, dots, fill, opacity, neutral, active, onHover }) {
  return (
    <g
      onMouseEnter={() => onHover(code)}
      onMouseLeave={() => onHover(null)}
      fill={neutral ? undefined : fill}
      className={
        neutral
          ? active
            ? 'fill-slate-400 dark:fill-slate-500'
            : 'fill-slate-300 dark:fill-slate-700'
          : undefined
      }
      style={{ opacity, transition: 'opacity 180ms ease' }}
    >
      <path d={outline} fill="transparent" stroke="none" pointerEvents="all" />
      {dots.map((dot) => (
        <circle key={`${dot.x}-${dot.y}`} cx={dot.x} cy={dot.y} r={active ? DOT_RADIUS + 0.35 : DOT_RADIUS} />
      ))}
    </g>
  )
})

function Hotspot({ row, rank, center, radius, gradientId, active, pulse, reduceMotion, onHover }) {
  const color = getTierColor(rank)
  return (
    <g
      tabIndex={0}
      role="group"
      aria-label={`${row.name || row.state}: ${formatInt(row.orders)} orders`}
      onFocus={() => onHover(row.state)}
      onBlur={() => onHover(null)}
      onMouseEnter={() => onHover(row.state)}
      onMouseLeave={() => onHover(null)}
      className="cursor-pointer outline-none"
    >
      <circle cx={center.x} cy={center.y} r={radius * 2.8} fill={`url(#${gradientId})`} pointerEvents="none" />
      {pulse && !reduceMotion && (
        <circle cx={center.x} cy={center.y} r={radius} fill="none" stroke={color} strokeWidth="1.2" className="anim-radar" />
      )}
      {active && (
        <circle cx={center.x} cy={center.y} r={radius + 5} fill="none" stroke={color} strokeWidth="1.5" opacity="0.9" />
      )}
      <circle cx={center.x} cy={center.y} r={radius} fill={color} stroke="#ffffff" strokeOpacity="0.85" strokeWidth="1" />
    </g>
  )
}

function MapTooltip({ anchor, tone }) {
  const reduceMotion = useReducedMotion()
  const left = Math.min(78, Math.max(22, (anchor.x / MAP_WIDTH) * 100))
  const topPct = (anchor.y / MAP_HEIGHT) * 100
  const below = topPct < 45

  return (
    <motion.div
      aria-hidden="true"
      initial={reduceMotion ? false : { opacity: 0, y: below ? -4 : 4, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      className="pointer-events-none absolute z-50 drop-shadow-2xl"
      style={{
        left: `${left}%`,
        top: `${Math.min(90, Math.max(10, topPct))}%`,
        transform: below ? 'translate(-50%, 14px)' : 'translate(-50%, calc(-100% - 14px))'
      }}
    >
      <div className="min-w-[160px] max-w-[240px] rounded-xl border border-slate-200/90 bg-white/95 p-3 text-slate-900 shadow-2xl backdrop-blur-md dark:border-slate-700/80 dark:bg-slate-900/95 dark:text-slate-50">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5 dark:border-slate-800">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full shadow-xs" style={{ backgroundColor: tone }} />
          <span className="truncate text-xs font-bold">{anchor.title}</span>
        </div>
        <p className="mt-1 text-sm font-black tabular-nums text-indigo-600 dark:text-indigo-400">{anchor.headline}</p>
        {anchor.lines.length > 0 && (
          <dl className="mt-1.5 space-y-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {anchor.lines.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt>{label}</dt>
                <dd className="font-bold tabular-nums text-slate-800 dark:text-slate-200">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </motion.div>
  )
}

const plural = (n) => `${formatInt(n)} ${n === 1 ? 'order' : 'orders'}`

export default function BrazilDotMap({ states, hovered, onHover }) {
  const reduceMotion = useReducedMotion()
  const uid = useId().replace(/:/g, '')
  const model = getMapModel()

  const rows = useMemo(() => sanitizeRows(states), [states])
  const legend = useMemo(() => buildLegend(rows), [rows])
  const maxOrders = rows.length > 0 ? rows[0].orders : 0

  const rankByState = useMemo(() => {
    const map = new Map()
    rows.forEach((row, index) => map.set(row.state, { row, rank: index + 1 }))
    return map
  }, [rows])

  const othersRow = legend.find((item) => item.key === 'others') || null
  const highlighted = useMemo(() => {
    if (hovered === 'others') return new Set(othersRow ? othersRow.states : [])
    return hovered ? new Set([hovered]) : new Set()
  }, [hovered, othersRow])

  const hotspots = rows.slice(0, HOTSPOT_COUNT).filter((row) => model.centroids[row.state])
  const arcs = useMemo(() => {
    if (!SHOW_ARCS || rows.length < 2) return []
    const { centroids } = getMapModel()
    const origin = centroids[rows[0].state]
    if (!origin) return []
    return rows
      .slice(1, 1 + ARC_COUNT)
      .map((row, index) => ({ row, rank: index + 2, to: centroids[row.state] }))
      .filter((arc) => arc.to)
      .map((arc) => ({ ...arc, from: origin, path: buildArcPath(origin, arc.to) }))
  }, [rows])

  const topSummary = rows
    .slice(0, 3)
    .map((row) => `${row.name || row.state} ${formatInt(row.orders)}`)
    .join(', ')
  const ariaLabel = `Dotted map of Brazil by customer state. Top states by orders: ${topSummary}.`

  let tooltip = null
  if (hovered === 'others' && othersRow) {
    const biggest = rows.find((row) => othersRow.states.includes(row.state) && model.centroids[row.state])
    if (biggest) {
      tooltip = {
        ...model.centroids[biggest.state],
        tone: OTHERS_COLOR,
        title: 'Others',
        headline: plural(othersRow.orders),
        lines: [['States', formatInt(othersRow.states.length)], ['Share', `${othersRow.share.toFixed(1)}%`]]
      }
    }
  } else if (hovered && model.centroids[hovered]) {
    const entry = rankByState.get(hovered)
    const shape = model.shapes.find((s) => s.state === hovered)
    if (entry) {
      const { row, rank } = entry
      tooltip = {
        ...model.centroids[hovered],
        tone: getTierColor(rank),
        title: `${row.state} · ${row.name || shape?.name || row.state}`,
        headline: plural(row.orders),
        lines: [
          ['Revenue', formatCurrency(row.revenue)],
          ['Avg days', isNum(row.avgDays) ? row.avgDays.toFixed(1) : '—'],
          ['On-time rate', isNum(row.slaRate) ? `${row.slaRate.toFixed(1)}%` : '—']
        ]
      }
    } else {
      tooltip = {
        ...model.centroids[hovered],
        tone: OTHERS_COLOR,
        title: `${hovered} · ${shape?.name || hovered}`,
        headline: 'No primary orders',
        lines: []
      }
    }
  }

  const anyActive = highlighted.size > 0

  return (
    <div className="relative z-20 flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200/90 bg-[radial-gradient(ellipse_at_50%_42%,#e0e7ff_0%,#f8fafc_72%)] dark:border-slate-800 dark:bg-[radial-gradient(ellipse_at_50%_42%,#1e1b4b_0%,#0b1120_74%)] md:min-h-[380px]">
      <div className="relative w-full max-w-[343px] md:max-w-[407px]" style={{ aspectRatio: `${MAP_WIDTH} / ${MAP_HEIGHT}` }}>
        <svg viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} width="100%" preserveAspectRatio="xMidYMid meet" className="block h-full w-full">
          <defs>
            {hotspots.map((row, index) => {
              const color = getTierColor(index + 1)
              return (
                <radialGradient key={row.state} id={`${uid}-glow-${index}`}>
                  <stop offset="0%" stopColor={color} stopOpacity="0.55" />
                  <stop offset="100%" stopColor={color} stopOpacity="0" />
                </radialGradient>
              )
            })}
            {arcs.map((arc, index) => (
              <linearGradient
                key={arc.row.state}
                id={`${uid}-arc-${index}`}
                gradientUnits="userSpaceOnUse"
                x1={arc.from.x}
                y1={arc.from.y}
                x2={arc.to.x}
                y2={arc.to.y}
              >
                <stop offset="0%" stopColor={getTierColor(1)} stopOpacity="0.9" />
                <stop offset="100%" stopColor={getTierColor(arc.rank)} stopOpacity="0.9" />
              </linearGradient>
            ))}
          </defs>

          <g role="img" aria-label={ariaLabel}>
            {model.shapes.map((shape) => {
              const entry = rankByState.get(shape.state)
              const active = highlighted.has(shape.state)
              const ratio = entry && maxOrders > 0 ? Math.sqrt(entry.row.orders / maxOrders) : 0
              const base = entry ? 0.3 + 0.55 * ratio : 0.9
              const opacity = active ? 1 : anyActive ? base * 0.55 : base
              return (
                <StateDots
                  key={shape.state}
                  code={shape.state}
                  outline={shape.outline}
                  dots={shape.dots}
                  neutral={!entry}
                  fill={entry ? getTierColor(entry.rank) : undefined}
                  opacity={opacity}
                  active={active}
                  onHover={onHover}
                />
              )
            })}
          </g>

          {arcs.length > 0 && (
            <g fill="none" pointerEvents="none">
              {arcs.map((arc, index) => (
                <motion.path
                  key={`${rows[0].state}-${arc.row.state}`}
                  d={arc.path}
                  stroke={`url(#${uid}-arc-${index})`}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  initial={reduceMotion ? false : { pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.8 }}
                  transition={reduceMotion ? { duration: 0 } : { duration: 1.1, delay: 0.25 + index * 0.12, ease: 'easeOut' }}
                />
              ))}
            </g>
          )}

          <g role="group" aria-label="Top states by orders">
            {hotspots.map((row, index) => (
              <Hotspot
                key={row.state}
                row={row}
                rank={index + 1}
                center={model.centroids[row.state]}
                radius={5 + 11 * Math.sqrt(maxOrders > 0 ? row.orders / maxOrders : 0)}
                gradientId={`${uid}-glow-${index}`}
                active={hovered === row.state}
                pulse={index === 0}
                reduceMotion={reduceMotion}
                onHover={onHover}
              />
            ))}
          </g>
        </svg>

        {tooltip && <MapTooltip key={tooltip.title} anchor={tooltip} tone={tooltip.tone} />}
      </div>
    </div>
  )
}
