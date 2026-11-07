import { humanizeSnakeText } from '../../../utils/labels'

function parseBlocks(source) {
  let text = String(source ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  text = text.replace(/(R\$)\s*\n+\s*/g, '$1 ')

  const rawBlocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)

  return rawBlocks.map((block) => {
    const rawLines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    const mergedLines = []
    for (let i = 0; i < rawLines.length; i++) {
      if (mergedLines.length > 0 && /R\$\s*$/.test(mergedLines[mergedLines.length - 1])) {
        mergedLines[mergedLines.length - 1] = `${mergedLines[mergedLines.length - 1]} ${rawLines[i]}`
      } else {
        mergedLines.push(rawLines[i])
      }
    }

    if (
      mergedLines.length >= 2 &&
      mergedLines.every((line) => /^[-•]\s+\S/.test(line))
    ) {
      return {
        type: 'ul',
        items: mergedLines.map((line) => line.replace(/^[-•]\s+/, '')),
      }
    }

    if (
      mergedLines.length >= 2 &&
      mergedLines.every((line) => /^\d{1,2}\.\s+\S/.test(line))
    ) {
      return {
        type: 'ol',
        items: mergedLines.map((line) => line.replace(/^\d{1,2}\.\s+/, '')),
      }
    }

    return { type: 'p', text: mergedLines.join(' ') }
  })
}

function renderInlineHighlight(text, keyPrefix = 'inline') {
  if (typeof text !== 'string') return null

  const parts = text.split(/(\*\*[^*]+\*\*)/g)

  return parts.map((part, index) => {
    const key = `${keyPrefix}-${index}`

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      const inner = part.slice(2, -2)
      return (
        <span
          key={key}
          className="font-semibold tabular-nums text-indigo-600 dark:text-indigo-400"
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
                className="font-semibold tabular-nums text-indigo-600 dark:text-indigo-400"
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

const bodyClass = 'text-[15px] font-medium leading-relaxed text-slate-900 dark:text-slate-100'

export default function MarkdownLite({ text }) {
  const blocks = parseBlocks(text)

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        if (block.type === 'ul') {
          return (
            <ul
              key={i}
              className={`list-disc space-y-1.5 pl-6 marker:text-indigo-600 dark:marker:text-indigo-400 ${bodyClass}`}
            >
              {block.items.map((item, j) => (
                <li key={j}>{renderInlineHighlight(item, `ul-${i}-${j}`)}</li>
              ))}
            </ul>
          )
        }
        if (block.type === 'ol') {
          return (
            <ol
              key={i}
              className={`list-decimal space-y-1.5 pl-6 marker:font-semibold marker:text-indigo-600 dark:marker:text-indigo-400 ${bodyClass}`}
            >
              {block.items.map((item, j) => (
                <li key={j}>{renderInlineHighlight(item, `ol-${i}-${j}`)}</li>
              ))}
            </ol>
          )
        }
        return (
          <p key={i} className={bodyClass}>
            {renderInlineHighlight(block.text, `p-${i}`)}
          </p>
        )
      })}
    </div>
  )
}
