const EN = 'en-US'

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export const compact = (n) =>
  isNum(n)
    ? new Intl.NumberFormat(EN, { notation: 'compact', maximumFractionDigits: 1 }).format(n)
    : 'N/A'

export const formatInt = (v) => (isNum(v) ? Math.round(v).toLocaleString(EN) : 'N/A')

export const formatCurrency = (v) =>
  isNum(v)
    ? `R$ ${v.toLocaleString(EN, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : 'N/A'

export function formatValue(v, fmt) {
  if (!isNum(v)) return typeof v === 'string' && v.trim() !== '' ? v : 'N/A'
  if (fmt === 'currency') return formatCurrency(v)
  if (fmt === 'signed_percent') return `${v > 0 ? '+' : ''}${v.toFixed(1)}%`
  if (fmt === 'percent_2' || fmt === 'ontime_rate') return `${v.toFixed(2)}%`
  if (fmt === 'percent') return `${v.toFixed(1)}%`
  if (fmt === 'days') return `${v.toFixed(2)} days`
  if (fmt === 'score') return `${v.toFixed(2)}`
  return v.toLocaleString(EN, { maximumFractionDigits: 2 })
}

export function formatAxis(v, fmt) {
  if (!isNum(v)) return v
  if (fmt === 'signed_percent') return `${v >= 0 ? '+' : ''}${Math.round(v)}%`
  if (fmt === 'percent') return `${Math.round(v)}%`
  return compact(v)
}

export function paddedDomain(values, { include = [], pad = 0.15, floorZero = false } = {}) {
  const nums = [...values.filter(isNum), ...include]
  if (nums.length === 0) return ['auto', 'auto']
  const min = Math.min(...nums)
  const max = Math.max(...nums)
  const span = max - min || Math.abs(max) * 0.1 || 1
  const lo = min - span * pad
  return [floorZero ? Math.max(0, lo) : lo, max + span * pad]
}
