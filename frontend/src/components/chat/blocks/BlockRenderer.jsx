import { motion, useReducedMotion } from 'framer-motion'
import ErrorBoundary from '../../ui/ErrorBoundary'
import HeadlineBlock from './HeadlineBlock'
import MetricCardsBlock from './MetricCardsBlock'
import InsightBlock from './InsightBlock'
import CaveatBlock from './CaveatBlock'
import TableBlock from './TableBlock'
import RecommendationsBlock from './RecommendationsBlock'
import FollowUpsBlock from './FollowUpsBlock'
import ChatMarkdown from './ChatMarkdown'
import ChatChart from '../charts/ChatChart'

const blockMotion = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } }
}

export default function BlockRenderer({
  blocks = [],
  tableData = null,
  chartSpec = null,
  question = '',
  onPick = null
}) {
  const reduceMotion = useReducedMotion()

  if (!Array.isArray(blocks) || blocks.length === 0) return null

  return (
    <div className="space-y-4">
      {blocks.map((block, idx) => {
        if (!block || !block.type) return null

        let content
        switch (block.type) {
          case 'headline':
            content = <HeadlineBlock text={block.text} />
            break
          case 'metric_cards':
            content = <MetricCardsBlock items={block.items} />
            break
          case 'chart':
            content = (
              <ChatChart
                spec={block.spec || chartSpec}
                rows={tableData?.rows || []}
                question={question}
              />
            )
            break
          case 'insight':
            content = <InsightBlock text={block.text} evidence={block.evidence} />
            break
          case 'recommendations':
            content = <RecommendationsBlock items={block.items} />
            break
          case 'caveat':
            content = <CaveatBlock text={block.text} level={block.level} />
            break
          case 'table':
            content = (
              <TableBlock
                columns={block.columns || tableData?.columns || []}
                rows={block.rows || tableData?.rows || []}
                maxRows={block.max_rows || 5}
              />
            )
            break
          case 'follow_ups':
            content = <FollowUpsBlock items={block.items} onPick={onPick} />
            break
          case 'text':
          default:
            content = <ChatMarkdown content={block.markdown || block.text || ''} />
            break
        }

        return (
          <ErrorBoundary key={`block-${idx}-${block.type}`}>
            <motion.div
              variants={reduceMotion ? undefined : blockMotion}
              initial={reduceMotion ? undefined : 'hidden'}
              animate={reduceMotion ? undefined : 'show'}
              transition={reduceMotion ? undefined : { delay: idx * 0.04 }}
            >
              {content}
            </motion.div>
          </ErrorBoundary>
        )
      })}
    </div>
  )
}

