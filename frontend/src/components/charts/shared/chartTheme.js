import { formatAxis, formatValue, compact, formatCurrency, isNum } from '../../../utils/format'
import { humanizeLabel } from '../../../utils/labels'

export const CHART_PALETTE = [
  '#590907',
  '#7D7F73',
  '#C9A57A',
  '#8A3530',
  '#A5A79B',
  '#B7832A',
  '#6B8A4F',
  '#D9BC96'
]

export const CHART_TOKENS = {
  bar: {
    maxBarSize: 48,
    barCategoryGap: '38%',
    radiusVertical: [6, 6, 0, 0],
    radiusHorizontal: [0, 6, 6, 0]
  },
  axis: {
    fontSize: 11,
    tickLine: false,
    axisLine: false
  },
  grid: {
    strokeDasharray: '3 3',
    vertical: false
  }
}

export function getGridColor(isDark) {
  return isDark ? '#36332D' : '#EDDFC8'
}

export function getTickColor(isDark) {
  return isDark ? '#A5A79B' : '#85877B'
}

export function formatChartValue(val, fmt) {
  if (!isNum(val)) return val ?? ''
  if (fmt === 'currency') return formatCurrency(val)
  if (fmt === 'percent_2' || fmt === 'ontime_rate') return `${val.toFixed(2)}%`
  if (fmt === 'percent' || fmt === 'signed_percent') return `${val.toFixed(1)}%`
  if (fmt === 'days') return `${val.toFixed(2)} days`
  if (fmt === 'score') return val.toFixed(2)
  if (Math.abs(val) >= 1000) return compact(val)
  return val.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

export function getChartHeight(dataLength = 5, chartType = 'bar') {
  if (chartType === 'horizontal_bar') {
    return Math.max(220, Math.min(480, dataLength * 36 + 60))
  }
  if (dataLength <= 5) return 230
  if (dataLength <= 10) return 270
  return 320
}

export { formatAxis, formatValue, compact, formatCurrency, isNum, humanizeLabel }

