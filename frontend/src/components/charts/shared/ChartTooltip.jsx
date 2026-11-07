import { formatChartValue, humanizeLabel } from './chartTheme'

export default function ChartTooltip({ active, payload, label, yFormat }) {
  if (!active || !payload?.length) return null

  const humanizedTitle = humanizeLabel(String(label ?? ''))

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white/95 p-3 text-xs shadow-xl backdrop-blur-md transition-colors dark:border-slate-800/90 dark:bg-slate-900/95">
      {humanizedTitle && (
        <p className="mb-2 border-b border-slate-100 pb-1.5 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
          {humanizedTitle}
        </p>
      )}
      <div className="space-y-1.5">
        {payload.map((entry, idx) => {
          const color = entry.color || entry.fill || entry.stroke || '#590907'
          const name = humanizeLabel(String(entry.name || 'Value'))
          const val = entry.value

          let formattedVal = formatChartValue(val, yFormat)
          const lowerName = name.toLowerCase()

          if (!yFormat) {
            if (lowerName.includes('on-time') || lowerName.includes('on time') || lowerName.includes('ontime')) {
              formattedVal = formatChartValue(val, 'percent_2')
            } else if (lowerName.includes('revenue') || lowerName.includes('aov') || lowerName.includes('price') || lowerName.includes('spend')) {
              formattedVal = formatChartValue(val, 'currency')
            } else if (lowerName.includes('rate') || lowerName.includes('%') || lowerName.includes('share') || lowerName.includes('percent')) {
              formattedVal = formatChartValue(val, 'percent')
            } else if (lowerName.includes('days') || lowerName.includes('delivery')) {
              formattedVal = formatChartValue(val, 'days')
            } else if (lowerName.includes('score') || lowerName.includes('rating')) {
              formattedVal = formatChartValue(val, 'score')
            }
          }

          return (
            <div key={idx} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                {name}:
              </span>
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formattedVal}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

