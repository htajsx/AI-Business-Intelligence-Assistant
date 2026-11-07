import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, FileText } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import RightRail from '../components/layout/RightRail'
import DataFooter from '../components/layout/DataFooter'
import ReportToolbar from '../components/report/toolbar/ReportToolbar'
import ReportProgress from '../components/report/progress/ReportProgress'
import ReportViewer from '../components/report/viewer/ReportViewer'
import ReportOutline from '../components/report/outline/ReportOutline'
import { downloadPdf, printReport } from '../utils/exportReport'
import useReport from '../hooks/useReport'
import { useChatContext } from '../context/ChatContext'
import {
  DEFAULT_FILTERS,
  areFiltersEqual,
  parseFilters,
  serializeFilters,
} from '../utils/filterParams'
import { REPORT_META } from '../config/constants'
import { card, focusRing } from '../utils/ui'
import '../components/report/pdf/print.css'

const cardShadow = 'shadow-md shadow-slate-900/5 dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]'

function slugify(text) {
  return String(text ?? 'report')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function StateCard({ children }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`${card} mx-auto flex max-w-xl flex-col items-center rounded-2xl border border-slate-200/90 bg-white/95 px-8 py-12 text-center dark:border-[#2F2A24] dark:bg-[#1B1814]/95 ${cardShadow}`}
    >
      {children}
    </motion.div>
  )
}

function EmptyState({ onGenerate }) {
  return (
    <StateCard>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs dark:bg-indigo-500/15 dark:text-indigo-300">
        <FileText size={28} aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
        Generate Your First KPI Report
      </h2>
      <p className="mt-2 max-w-md text-sm font-bold leading-relaxed text-slate-700 dark:text-slate-300">
        Select a timeframe and custom filters. The system will automatically execute
        metric queries and produce a comprehensive analytical report.
      </p>
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onGenerate}
        className={`mt-6 flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-700 ${focusRing}`}
      >
        Generate Report Now
      </motion.button>
    </StateCard>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <StateCard>
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600 shadow-xs dark:bg-red-500/15 dark:text-red-300">
        <AlertTriangle size={28} aria-hidden="true" />
      </div>
      <h2 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white">
        Report Generation Failed
      </h2>
      <p
        role="alert"
        className="mt-2 max-w-md text-sm font-bold leading-relaxed text-red-600 dark:text-red-400"
      >
        {message}
      </p>
      <motion.button
        type="button"
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onRetry}
        className={`mt-6 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-extrabold text-white shadow-md shadow-indigo-500/25 transition-colors hover:bg-indigo-700 ${focusRing}`}
      >
        Retry
      </motion.button>
    </StateCard>
  )
}

export default function ReportPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [scrollRoot, setScrollRoot] = useState(null)

  const [filters, setFilters] = useState(() => {
    if (location.search) {
      return parseFilters(location.search)
    }
    try {
      const saved = sessionStorage.getItem('last_report_filters')
      if (saved) return JSON.parse(saved)
    } catch (e) {
      void e
    }
    return DEFAULT_FILTERS
  })

  const [initialReport] = useState(() => {
    try {
      const savedReportStr = sessionStorage.getItem('last_generated_report')
      if (savedReportStr) {
        const parsed = JSON.parse(savedReportStr)
        if (parsed?.report && areFiltersEqual(parsed.filters, filters)) {
          return parsed.report
        }
      }
    } catch (e) {
      void e
    }
    return null
  })

  const { status, report, error, phaseIndex, generate, retry, reset } = useReport(initialReport)
  const [isExporting, setIsExporting] = useState(false)

  useEffect(() => {
    if (status === 'ready' && report) {
      try {
        sessionStorage.setItem('last_generated_report', JSON.stringify({ filters, report }))
        sessionStorage.setItem('last_report_filters', JSON.stringify(filters))
      } catch (e) {
        void e
      }
    }
  }, [status, report, filters])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const autoGen = params.get('autoGenerate') === '1'

    if (autoGen) {
      params.delete('autoGenerate')
      const cleanSearch = params.toString() ? `?${params.toString()}` : ''
      const newUrl = `${window.location.pathname}${cleanSearch}${window.location.hash}`
      window.history.replaceState(window.history.state, '', newUrl)

      const parsed = parseFilters(params)
      queueMicrotask(() => {
        setFilters(parsed)
        generate(parsed)
      })
    }
  }, [location.search, generate])

  const { openRailAndAsk } = useChatContext()

  const handleAsk = useCallback(
    (question) => {
      openRailAndAsk(question)
    },
    [openRailAndAsk],
  )

  const handleChange = useCallback((key, value) => {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }
      try {
        sessionStorage.setItem('last_report_filters', JSON.stringify(next))
      } catch (e) {
        void e
      }
      return next
    })
  }, [])

  const handleGenerate = useCallback(() => {
    const p = serializeFilters(filters)
    navigate({ search: p.toString() }, { replace: true })
    try {
      sessionStorage.setItem('last_report_filters', JSON.stringify(filters))
    } catch (e) {
      void e
    }
    generate(filters)
  }, [generate, filters, navigate])

  const handleReset = useCallback(() => {
    reset()
    setFilters(DEFAULT_FILTERS)
    try {
      sessionStorage.removeItem('last_generated_report')
      sessionStorage.removeItem('last_report_filters')
    } catch (e) {
      void e
    }
    navigate({ search: '' }, { replace: true })
  }, [reset, navigate])

  const handleExport = useCallback(
    async (mode) => {
      if (mode === 'print') {
        printReport()
        return
      }
      if (!report) return
      setIsExporting(true)
      try {
        await downloadPdf(report, `${slugify(report.title)}.pdf`)
      } catch (err) {
        console.error('[ReportPage] export failed:', err)
      } finally {
        setIsExporting(false)
      }
    },
    [report],
  )

  const isGenerating = status === 'generating'
  const hasReport = status === 'ready' && Boolean(report)

  return (
    <AppLayout rail={<RightRail onPick={handleAsk} onNewChat={() => navigate('/')} />}>
      <div
        ref={setScrollRoot}
        data-report-scroll
        className="thin-scroll h-full overflow-y-auto"
      >
        <div data-no-print className="mx-auto max-w-[1140px] px-6 pt-7 pb-4">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            Executive KPI &amp; Insights Report
          </h1>
          <p className="mt-1 text-[14px] font-bold text-slate-700 dark:text-slate-300">
            Automated periodic business performance analysis and KPI scorecard export
          </p>
        </div>

        <ReportToolbar
          filters={filters}
          activeReportFilters={report?.meta?.filters}
          onChange={handleChange}
          onGenerate={handleGenerate}
          onReset={handleReset}
          onExport={handleExport}
          isGenerating={isGenerating}
          isExporting={isExporting}
          hasReport={hasReport}
          scrollRoot={scrollRoot}
        />

        <div className="mx-auto max-w-[1140px] px-6 pb-8 pt-4">
          {status === 'idle' && <EmptyState onGenerate={handleGenerate} />}

          {isGenerating && <ReportProgress phaseIndex={phaseIndex} />}

          {status === 'error' && <ErrorState message={error} onRetry={retry} />}

          {hasReport && (
            <div className="flex gap-6">
              <div className="min-w-0 flex-1">
                <ReportViewer report={report} />
              </div>
              <ReportOutline visibleSections={report?.scope?.visibleSections} />
            </div>
          )}

          <div data-no-print className="mt-8">
            <DataFooter
              meta={{
                ...REPORT_META,
                period: report?.meta?.requestedPeriod || filters.period,
              }}
            />
          </div>
        </div>
      </div>

      {isExporting && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 backdrop-blur-md"
        >
          <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-extrabold text-slate-900 shadow-2xl dark:border-[#2F2A24] dark:bg-[#211D18] dark:text-white">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            Compiling and rendering high-resolution PDF document…
          </div>
        </div>
      )}
    </AppLayout>
  )
}