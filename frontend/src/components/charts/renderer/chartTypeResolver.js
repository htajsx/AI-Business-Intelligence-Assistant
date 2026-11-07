const TIME_PATTERN = /month|date|day|week|year|period|quarter|time|timestamp/i
const TIME_VAL_PATTERN = /^\d{4}-\d{2}/
const SHARE_QUESTION_PATTERN = /share|distribution|proportion|breakdown|composition|mix|split|payment/i
const RANKING_PATTERN = /top\s+\d+|bottom\s+\d+|rank|leading|highest|lowest|best|worst/i

export function resolveChartType(spec, rows, question = '') {
  if (!spec || !rows || rows.length === 0) return 'bar'

  const explicitType = (spec.type || '').toLowerCase().trim()
  if (explicitType && explicitType !== 'bar') {
    if (explicitType === 'composed') return 'combo'
    return explicitType
  }

  const xKey = spec.x
  const yKey = spec.y
  const q = String(question || '')
  const firstRow = rows[0] || {}

  const isTimeX =
    TIME_PATTERN.test(xKey) ||
    (typeof firstRow[xKey] === 'string' && TIME_VAL_PATTERN.test(firstRow[xKey]))

  if (isTimeX) {
    if (q.includes('area') || q.includes('volume') || q.includes('cumulative')) {
      return 'area'
    }
    return 'line'
  }

  const ySum = rows.reduce((acc, r) => acc + (typeof r[yKey] === 'number' ? r[yKey] : 0), 0)
  const isSumTo100 = Math.abs(ySum - 100) < 3.5

  if (
    rows.length >= 2 &&
    rows.length <= 6 &&
    (SHARE_QUESTION_PATTERN.test(q) ||
      isSumTo100 ||
      xKey === 'payment_type' ||
      xKey === 'order_status')
  ) {
    return 'donut'
  }

  const hasLongLabel = rows.some((r) => {
    const str = String(r[xKey] ?? '')
    return str.length > 10
  })

  if (RANKING_PATTERN.test(q) || rows.length > 5 || hasLongLabel) {
    return 'horizontal_bar'
  }

  return 'bar'
}

export function getAvailableChartTypes(currentType, rows = []) {
  const len = rows.length

  switch (currentType) {
    case 'donut':
      return ['donut', 'bar', 'horizontal_bar']
    case 'line':
      return ['line', 'area', 'bar']
    case 'area':
      return ['area', 'line', 'bar']
    case 'horizontal_bar':
      return len <= 6 ? ['horizontal_bar', 'bar', 'donut'] : ['horizontal_bar', 'bar']
    case 'combo':
      return ['combo', 'bar', 'line']
    case 'bar':
    default:
      if (len <= 6) return ['bar', 'donut', 'horizontal_bar']
      return ['bar', 'horizontal_bar', 'line']
  }
}
