import { motion } from 'framer-motion'
import KpiDefinitionCard from './KpiDefinitionCard'

export default function KpisTab({ kpis = [], query = '', onAsk, highlight }) {
  const q = String(query || '').trim().toLowerCase()
  const list = Array.isArray(kpis) ? kpis : []
  const filtered = list.filter((k) => {
    if (!q) return true
    const name = String(k?.name || '').toLowerCase()
    const desc = String(k?.description || k?.definition || '').toLowerCase()
    const formula = String(k?.formula || '').toLowerCase()
    const category = String(k?.category || '').toLowerCase()
    return name.includes(q) || desc.includes(q) || formula.includes(q) || category.includes(q)
  })

  if (query && filtered.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 border-dashed p-8 text-center text-slate-500 dark:border-[#2F2A24] dark:text-slate-400">
        No matches for "{query}". Try "revenue" or "orders".
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
      }}
      className="grid grid-cols-1 gap-3 lg:grid-cols-2"
    >
      {filtered.map((kpi) => (
        <motion.div
          key={kpi.id}
          variants={{
            hidden: { opacity: 0, y: 12 },
            visible: { opacity: 1, y: 0 }
          }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          viewport={{ once: true, amount: 0.15 }}
        >
          <KpiDefinitionCard kpi={kpi} onAsk={onAsk} highlight={highlight} />
        </motion.div>
      ))}
    </motion.div>
  )
}