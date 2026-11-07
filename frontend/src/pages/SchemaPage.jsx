import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import AppLayout from '../components/layout/AppLayout'
import RightRail from '../components/layout/RightRail'
import DataFooter from '../components/layout/DataFooter'
import SchemaTabs from '../components/schema/SchemaTabs'
import TablesTab from '../components/schema/tables/TablesTab'
import KpisTab from '../components/schema/kpis/KpisTab'
import { useSchema } from '../hooks/useSchema'

export function HighlightText({ text, query }) {
  if (!query || !text) return <>{text}</>
  const str = String(text)
  const parts = str.split(new RegExp(`(${query})`, 'gi'))
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="rounded-md bg-indigo-100 px-1 font-bold text-indigo-700 dark:bg-indigo-500/25 dark:text-indigo-300">
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  )
}

export default function SchemaPage() {
  const [activeTab, setActiveTab] = useState('tables')
  const [query, setQuery] = useState('')
  const { data, isLoading, error } = useSchema()
  const navigate = useNavigate()

  const handleAsk = (question) => {
    navigate('/', { state: { pendingQuestion: question } })
  }

  const highlight = (text) => <HighlightText text={text} query={query.toLowerCase()} />

  return (
    <AppLayout rail={<RightRail onPick={handleAsk} onNewChat={() => navigate('/')} />}>
      <div className="thin-scroll h-full overflow-y-auto">
        <div className="mx-auto max-w-[1140px] px-6 py-7">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">
                  Data Schema &amp; Governed KPIs
                </h1>
                <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
                  Comprehensive catalog of data tables, column attributes, and governed formulas across Olist Data Warehouse.
                </p>
              </div>
              {data && (
                <div className="inline-flex items-center rounded-xl border border-indigo-200 bg-indigo-50/90 px-3.5 py-1.5 text-xs font-extrabold text-indigo-800 shadow-xs dark:border-indigo-500/30 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <span>{data.tables.length} tables · {data.kpis.length} governed KPIs</span>
                </div>
              )}
            </div>

            <SchemaTabs
              activeTab={activeTab}
              onTabChange={(t) => {
                setActiveTab(t)
                setQuery('')
              }}
              query={query}
              onQueryChange={setQuery}
            />

            <div className="min-h-[400px]">
              {isLoading ? (
                <div className="flex animate-pulse flex-col gap-3.5">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 rounded-2xl bg-slate-200/70 dark:bg-white/10" />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  Failed to load schema catalog. Please refresh the page.
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  {activeTab === 'tables' ? (
                    <motion.div
                      key="tables"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <TablesTab tables={data.tables} query={query.toLowerCase()} onAsk={handleAsk} highlight={highlight} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="kpis"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <KpisTab kpis={data.kpis} query={query.toLowerCase()} onAsk={handleAsk} highlight={highlight} />
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {data?.meta && (
              <div className="mt-8">
                <DataFooter meta={data.meta} />
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  )
}