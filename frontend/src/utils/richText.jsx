import { useMemo } from 'react'
import { Info } from 'lucide-react'
import { humanizeSnakeText } from './labels'

export function normalizeAnswerText(raw) {
  if (typeof raw !== 'string') return { assumption: null, text: '' }

  let cleaned = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  cleaned = cleaned.replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')

  let assumption = null
  const assumptionMatch = cleaned.match(/^(?:\*\*)?(?:Assumption|Assumptions|Premissa|Premissas)\s*:\s*(.*?)(?:\*\*)?(?:\n+|$)/i)
  if (assumptionMatch) {
    assumption = assumptionMatch[1].trim()
    cleaned = cleaned.slice(assumptionMatch[0].length).trim()
  }

  cleaned = cleaned.replace(/:\s*([*•-]|(\d+\.))\s+/g, ':\n$1 ')
  cleaned = cleaned.replace(/([.:;!?]|\))\s*([*•-]|(\d+\.))\s+/g, '$1\n$2 ')

  return { assumption, text: cleaned }
}

function renderInline(text, keyPrefix = 'inline') {
  if (typeof text !== 'string') return null

  const parts = text.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const inner = part.slice(2, -2)
      return (
        <span
          key={key}
          className="font-bold tabular-nums text-slate-950 dark:text-slate-50"
        >
          {humanizeSnakeText(inner)}
        </span>
      )
    }

    const humanized = humanizeSnakeText(part)
    const tokenRegex = /(R\$\s*[\d,]+(?:\.\d+)?|\b\d+(?:,\d+)*(?:\.\d+)?%|\b\d+(?:,\d+)*\.\d+\b)/g
    const subParts = humanized.split(tokenRegex)

    if (subParts.length === 1) {
      return <span key={key}>{humanized}</span>
    }

    return (
      <span key={key}>
        {subParts.map((sub, sIdx) => {
          const subKey = `${key}-sub-${sIdx}`
          if (tokenRegex.test(sub)) {
            tokenRegex.lastIndex = 0
            return (
              <span
                key={subKey}
                className="font-semibold tabular-nums text-slate-950 dark:text-slate-50"
              >
                {sub}
              </span>
            )
          }
          tokenRegex.lastIndex = 0
          return <span key={subKey}>{sub}</span>
        })}
      </span>
    )
  })
}

export default function RichText({ text, showAssumption = true }) {
  const { assumption, text: normalized } = useMemo(
    () => normalizeAnswerText(text),
    [text]
  )

  const blocks = useMemo(() => {
    if (!normalized) return []
    const rawParagraphs = normalized.split(/\n{2,}/)
    const result = []

    rawParagraphs.forEach((para) => {
      const trimmed = para.trim()
      if (!trimmed) return

      const lines = trimmed.split('\n').map((l) => l.trim()).filter(Boolean)
      const isBulletItem = (l) => /^[*•-]\s+/.test(l)
      const isNumberItem = (l) => /^\d+\.\s+/.test(l)

      const hasList = lines.some((l) => isBulletItem(l) || isNumberItem(l))
      if (!hasList) {
        result.push({ type: 'p', content: trimmed })
        return
      }

      let currentList = null
      lines.forEach((line) => {
        if (isBulletItem(line)) {
          const content = line.replace(/^[*•-]\s+/, '')
          if (currentList && currentList.type === 'ul') {
            currentList.items.push(content)
          } else {
            if (currentList) result.push(currentList)
            currentList = { type: 'ul', items: [content] }
          }
        } else if (isNumberItem(line)) {
          const content = line.replace(/^\d+\.\s+/, '')
          if (currentList && currentList.type === 'ol') {
            currentList.items.push(content)
          } else {
            if (currentList) result.push(currentList)
            currentList = { type: 'ol', items: [content] }
          }
        } else {
          if (currentList) {
            result.push(currentList)
            currentList = null
          }
          result.push({ type: 'p', content: line })
        }
      })
      if (currentList) result.push(currentList)
    })

    return result
  }, [normalized])

  return (
    <div className="space-y-3 text-[14.5px] leading-relaxed text-slate-800 dark:text-slate-200">
      {showAssumption && assumption && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/90 px-3.5 py-2 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
          <Info size={15} className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
          <span className="leading-snug">{assumption}</span>
        </div>
      )}

      {blocks.map((block, idx) => {
        if (block.type === 'ul') {
          return (
            <ul key={`ul-${idx}`} className="list-disc space-y-1.5 pl-5 marker:text-indigo-500">
              {block.items.map((item, itemIdx) => (
                <li key={`ul-item-${itemIdx}`} className="leading-snug">
                  {renderInline(item, `ul-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ul>
          )
        }

        if (block.type === 'ol') {
          return (
            <ol key={`ol-${idx}`} className="list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-indigo-500">
              {block.items.map((item, itemIdx) => (
                <li key={`ol-item-${itemIdx}`} className="leading-snug">
                  {renderInline(item, `ol-${idx}-${itemIdx}`)}
                </li>
              ))}
            </ol>
          )
        }

        return (
          <p key={`p-${idx}`}>
            {renderInline(block.content, `p-${idx}`)}
          </p>
        )
      })}
    </div>
  )
}
