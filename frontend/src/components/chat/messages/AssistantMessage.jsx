import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, RotateCcw, ThumbsDown, ThumbsUp, Info, Layers, Download, ArrowRight } from 'lucide-react'
import CopyButton from '../../ui/CopyButton'
import ResultTable from '../results/ResultTable'
import SqlViewer from '../results/SqlViewer'
import ChatMarkdown from '../blocks/ChatMarkdown'
import ChatChart from '../charts/ChatChart'
import BlockRenderer from '../blocks/BlockRenderer'
import { normalizeAnswerText } from '../../../utils/richText'
import { exportTableToCsv } from '../../../utils/csvExport'
import { card, divider, ghostBase, ghostBtn } from '../../../utils/ui'

const container = {
  hidden: { opacity: 0, x: -8, y: 14 },
  show: {
    opacity: 1,
    x: 0,
    y: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut',
      when: 'beforeChildren',
      delayChildren: 0.08,
      staggerChildren: 0.08
    }
  }
}

const block = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' } }
}

export default function AssistantMessage({ message, question = '', onRetry, onRegenerate, compact = false }) {
  const navigate = useNavigate()
  const { content, data, error, retryQuestion } = message
  const [vote, setVote] = useState(null)

  const { assumption, text: cleanText } = useMemo(() => {
    return normalizeAnswerText(content)
  }, [content])

  if (error) {
    return (
      <motion.div variants={container} initial="hidden" animate="show" className="w-full">
        <div className={`flex min-w-0 flex-1 items-start gap-2.5 rounded-xl border border-red-300 bg-red-50 text-red-900 dark:border-red-500/40 dark:bg-red-950/30 dark:text-red-200 ${compact ? 'p-3 text-xs' : 'p-4 text-[15px]'}`}>
          <AlertTriangle size={compact ? 18 : 22} className="mt-0.5 shrink-0 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <p className="font-bold">{content}</p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onRetry?.(retryQuestion)}
              className="mt-2.5 flex cursor-pointer items-center rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white shadow-sm transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              Retry query
            </motion.button>
          </div>
        </div>
      </motion.div>
    )
  }

  const hasBlocks = Boolean(data?.blocks && Array.isArray(data.blocks) && data.blocks.length > 0)
  const isBrazilMap = data?.chart?.type === 'brazil_map'
  const hasChart = Boolean(data?.chart && data?.table?.rows?.length)
  const hasTable = Boolean(data?.table?.rows?.length)
  const hasSql = Boolean(data?.sql)
  const scope = data?.scope

  const activeVote = (v, tone) =>
    vote === v ? `${ghostBase} ${tone}` : ghostBtn

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="w-full">
      <div
        className={`group min-w-0 flex-1 rounded-2xl border border-slate-200/90 bg-white/95 shadow-md shadow-slate-900/5 dark:border-[#36302A] dark:bg-[#1B1814]/95 dark:shadow-[0_4px_24px_rgba(0,0,0,0.4)] ${card}`}
      >
        <div
          className={`flex items-center justify-between border-b px-3.5 py-2 ${divider} rounded-t-2xl bg-slate-50/70 dark:bg-[#211D18]/70`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {compact ? 'AI Answer' : 'Data Analytics Report'}
            </span>

            {!compact && scope?.label && (
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Layers size={11} />
                <span>{scope.label}</span>
              </span>
            )}

            {data?.latency_ms && (
              <span className={`${compact ? 'inline-block' : 'hidden sm:inline-block'} rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300`}>
                ⚡ {(data.latency_ms / 1000).toFixed(2)}s
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <CopyButton text={content.replace(/\*\*/g, '')} className={ghostBtn} />
            {!compact && data?.table?.rows?.length > 0 && (
              <button
                type="button"
                aria-label="Download CSV"
                title="Download CSV"
                onClick={() => exportTableToCsv(data.table.columns, data.table.rows, 'data_analytics_report.csv')}
                className={ghostBtn}
              >
                <Download size={15} />
              </button>
            )}
            {!compact && (
              <>
                <button
                  aria-label="Good response"
                  title="Accurate analysis"
                  aria-pressed={vote === 'up'}
                  onClick={() => setVote((v) => (v === 'up' ? null : 'up'))}
                  className={activeVote('up', 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold')}
                >
                  <ThumbsUp size={15} />
                </button>
                <button
                  aria-label="Poor response"
                  title="Needs improvement"
                  aria-pressed={vote === 'down'}
                  onClick={() => setVote((v) => (v === 'down' ? null : 'down'))}
                  className={activeVote('down', 'bg-red-500/20 text-red-600 dark:text-red-400 font-bold')}
                >
                  <ThumbsDown size={15} />
                </button>
              </>
            )}
            {!compact && onRegenerate && (
              <button
                aria-label="Rerun query"
                title="Rerun this query"
                onClick={onRegenerate}
                className={ghostBtn}
              >
                <RotateCcw size={15} />
              </button>
            )}
          </div>
        </div>

        {assumption && (
          <motion.div variants={block} className={compact ? "px-3.5 pt-2 pb-0" : "px-5 pt-3.5 pb-0"}>
            <div className="flex items-start gap-2 rounded-lg border border-slate-200/80 bg-slate-50/90 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
              <Info size={13} className="mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
              <span className="leading-snug">{assumption}</span>
            </div>
          </motion.div>
        )}

        <motion.div variants={block} className={compact ? "px-3.5 py-3 text-xs leading-relaxed" : "px-5 py-4"}>
          {hasBlocks ? (
            <BlockRenderer
              blocks={data.blocks}
              tableData={data.table}
              chartSpec={data.chart}
              question={question}
              onPick={onRetry}
            />
          ) : (
            <ChatMarkdown content={cleanText} />
          )}
        </motion.div>

        {!hasBlocks && hasChart && (
          <motion.div variants={block} className={`border-t ${divider} bg-slate-50/40 dark:bg-[#211D18]/30`}>
            {compact && isBrazilMap ? (
              <div className="p-3 text-center">
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:text-indigo-400 dark:hover:bg-indigo-900/60 transition-colors"
                >
                  <span>Map visualization available · Open in full chat</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : (
              <ChatChart
                spec={data.chart}
                rows={data.table.rows}
                question={question}
                compact={compact}
              />
            )}
          </motion.div>
        )}

        {!hasBlocks && hasTable && (
          <motion.div variants={block} className={`border-t ${divider}`}>
            <ResultTable
              table={data.table}
              maxRows={compact ? 5 : undefined}
              onShowMore={compact ? () => navigate('/') : undefined}
            />
          </motion.div>
        )}

        {hasSql && (
          <motion.div variants={block} className={`border-t ${divider}`}>
            <SqlViewer
              sql={data.sql}
              tables={data.tables_used}
              tools={data.tools_called}
              latency={data.latency_ms}
            />
          </motion.div>
        )}
      </div>
    </motion.div>
  )
}
