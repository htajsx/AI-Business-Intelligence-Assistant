import { humanizeLabel } from '../../../utils/labels'

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatTimeTick(val) {
  if (typeof val !== 'string') return null
  const clean = val.trim()
  const mMatch = clean.match(/^(\d{4})[-/\s](\d{1,2})(?:[-/\s]\d{1,2})?$/)
  if (mMatch) {
    const yr = mMatch[1].slice(2)
    const mIdx = parseInt(mMatch[2], 10) - 1
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_NAMES[mIdx]} '${yr}`
    }
  }
  const qMatch = clean.match(/^(\d{4})[-/\s]?Q([1-4])$/i)
  if (qMatch) {
    return `Q${qMatch[2]} '${qMatch[1].slice(2)}`
  }
  return null
}

export default function HorizontalTick({ x, y, payload, visibleTicksCount = 5, width = 600, isDark = false }) {
  if (!payload || payload.value === undefined || payload.value === null) {
    return null
  }

  const raw = String(payload.value)
  const timeFormatted = formatTimeTick(raw)
  const fullText = timeFormatted || humanizeLabel(raw)
  const availableWidth = visibleTicksCount > 0 ? (width - 40) / visibleTicksCount : 80

  const fontSize = availableWidth < 60 || visibleTicksCount > 8 ? 10 : 11
  const maxCharsPerLine = Math.max(7, Math.floor(availableWidth / (fontSize * 0.58)))

  let line1 = fullText
  let line2 = null

  if (!timeFormatted && fullText.length > maxCharsPerLine) {
    const words = fullText.split(' ')
    if (words.length > 1) {
      let l1 = ''
      let l2 = ''
      for (const word of words) {
        if ((l1 + ' ' + word).trim().length <= maxCharsPerLine) {
          l1 = (l1 + ' ' + word).trim()
        } else {
          l2 = (l2 + ' ' + word).trim()
        }
      }
      line1 = l1 || words[0]
      line2 = l2 || words.slice(1).join(' ')
    } else {
      line1 = fullText.slice(0, maxCharsPerLine)
      line2 = fullText.slice(maxCharsPerLine)
    }

    if (line2 && line2.length > maxCharsPerLine) {
      line2 = line2.slice(0, Math.max(4, maxCharsPerLine - 1)) + '…'
    }
  }

  const fill = isDark ? '#A5A79B' : '#85877B'

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        textAnchor="middle"
        fill={fill}
        fontSize={fontSize}
        fontWeight={500}
        dominantBaseline="hanging"
      >
        <tspan x={0} dy={6}>
          {line1}
        </tspan>
        {line2 && (
          <tspan x={0} dy={fontSize + 3}>
            {line2}
          </tspan>
        )}
      </text>
    </g>
  )
}
