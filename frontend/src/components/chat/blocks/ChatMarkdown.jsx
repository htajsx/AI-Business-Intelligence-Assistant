import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function sanitizeText(raw) {
  if (typeof raw !== 'string') return ''
  let cleaned = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  cleaned = cleaned.replace(/\*([A-Za-z0-9 ]+)\*/g, '**$1**')
  cleaned = cleaned.replace(/^###\s*(.*)$/gm, '**$1**')
  cleaned = cleaned.replace(/^##\s*(.*)$/gm, '**$1**')
  cleaned = cleaned.replace(/^#\s*(.*)$/gm, '**$1**')
  return cleaned
}

export default function ChatMarkdown({ content, className = '' }) {
  const clean = sanitizeText(content)

  return (
    <div className={`text-[14.5px] leading-relaxed text-slate-800 dark:text-slate-200 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h3 className="mb-2 mt-3 text-base font-bold text-slate-950 dark:text-slate-50">
              {children}
            </h3>
          ),
          h2: ({ children }) => (
            <h4 className="mb-1.5 mt-2.5 text-sm font-bold text-slate-900 dark:text-slate-100">
              {children}
            </h4>
          ),
          h3: ({ children }) => (
            <h5 className="mb-1 mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {children}
            </h5>
          ),
          p: ({ children }) => (
            <p className="mb-2.5 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-slate-950 dark:text-slate-50 tabular-nums">
              {children}
            </strong>
          ),
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 pl-5 marker:text-indigo-500 last:mb-0">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 pl-5 marker:font-bold marker:text-indigo-500 last:mb-0">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-snug">
              {children}
            </li>
          ),
          code: ({ children, inline }) => (
            inline ? (
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                {children}
              </code>
            ) : (
              <pre className="my-2 overflow-x-auto rounded-lg bg-slate-100 p-3 font-mono text-xs dark:bg-slate-900/90 dark:text-slate-200">
                <code>{children}</code>
              </pre>
            )
          )
        }}
      >
        {clean}
      </ReactMarkdown>
    </div>
  )
}

