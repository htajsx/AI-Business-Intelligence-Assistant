// frontend/src/components/report/ReportViewer.jsx
import { useMemo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Compass,
  FileCheck,
  Gauge,
  Info,
  Layers,
  Lightbulb,
  MapPin,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  ExternalLink,
  Building2,
  CalendarDays,
  Calendar,
  Check,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Target,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts'
import { formatCurrency, formatInt, formatValue } from '../../../utils/format'
import { humanizeLabel } from '../../../utils/labels'
import { card, focusRing } from '../../../utils/ui'
import { serializeFilters } from '../../../utils/filterParams'
import RichText from '../../../utils/richText'
import MarkdownLite from './MarkdownLite'
import ReportSection, { getItemVariants } from './ReportSection'
import { KpiCard, OperationCard, StatusPill, statusTone } from './ReportCards'
import ReportTable from './ReportTable'
import TrendAreaChart from './TrendAreaChart'
import { stripScope } from '../lib/reportText'
import {
  REPORT_SECTION_ORDER,
  SECTION_SCROLL_OFFSET,
} from '../lib/reportLayout'

const innerBorder = 'border-slate-200 dark:border-[#2F2A24]'

function PriorityPill({ priority }) {
  const p = (priority || 'medium').toLowerCase()
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wider whitespace-nowrap ${p === 'high'
        ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
        : p === 'medium'
          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
          : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
        }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${p === 'high'
          ? 'bg-rose-500'
          : p === 'medium'
            ? 'bg-amber-500'
            : 'bg-slate-400'
          }`}
      />
      {priority}
    </span>
  )
}

function PositionCard({ position }) {
  if (!position) return null
  return (
    <div
      id="position"
      style={{ scrollMarginTop: SECTION_SCROLL_OFFSET }}
      className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
            {position.title}
          </span>
          <h3 className="mt-0.5 text-lg font-black text-slate-950 dark:text-white">
            {position.name}
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-400">
            {position.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Market Share
            </p>
            <p className="text-2xl font-black tabular-nums text-indigo-600 dark:text-indigo-400">
              {position.sharePct?.toFixed(1)}%
            </p>
          </div>
          <div className="border-l border-indigo-200 pl-6 text-right dark:border-indigo-900/50">
            <p className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Sales Volume
            </p>
            <p className="text-lg font-black tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(position.revenue)}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function parseSurgeDescription(desc = '') {
  const sigmaMatch = desc.match(/([+-]?\d+(?:\.\d+)?)\s*σ/i)
  const ordersMatch = desc.match(/(\d[\d,]*)\s*orders/i)
  const baselineMatch = desc.match(/baseline\s*(?:of)?\s*(\d[\d,]*)/i)

  const sigma = sigmaMatch ? parseFloat(sigmaMatch[1]) : null
  const peakOrders = ordersMatch ? parseInt(ordersMatch[1].replace(/,/g, ''), 10) : null
  const baselineOrders = baselineMatch
    ? parseInt(baselineMatch[1].replace(/,/g, ''), 10)
    : null

  return { sigma, peakOrders, baselineOrders }
}

const containerVariants = {
  hidden: {},
  show: { transition: { when: 'beforeChildren', delayChildren: 0.05, staggerChildren: 0.05 } },
}

export default function ReportViewer({ report }) {
  const reduce = useReducedMotion()
  const meta = useMemo(() => report?.meta || {}, [report?.meta])
  const scope = useMemo(() => report?.scope || {}, [report?.scope])
  const comparisonAvailable = Boolean(scope.comparisonAvailable ?? meta.comparisonAvailable)
  const visible = useMemo(() => scope.visibleSections || [], [scope.visibleSections])

  const showSection = (id) => visible.length === 0 || visible.includes(id)

  const sectionIndexMap = useMemo(() => {
    const set = new Set(visible.length > 0 ? visible : REPORT_SECTION_ORDER)
    const map = {}
    let counter = 1
    for (const id of REPORT_SECTION_ORDER) {
      if (set.has(id)) {
        map[id] = counter++
      }
    }
    return map
  }, [visible])

  const cleanTitle = useMemo(
    () => stripScope(report.title, scope, meta),
    [report.title, scope, meta],
  )

  const isNonDefaultScope = useMemo(() => {
    const l = scope.label || ''
    return Boolean(
      l &&
      !l.toLowerCase().includes('all time') &&
      !l.toLowerCase().includes('all categories') &&
      !l.toLowerCase().includes('all states'),
    )
  }, [scope.label])

  const dashboardQuery = useMemo(
    () =>
      serializeFilters({
        period: meta.filters?.period,
        category: meta.filters?.category,
        state: meta.filters?.state,
        granularity: meta.filters?.granularity,
      }).toString(),
    [meta.filters],
  )

  const validationReconciliation = useMemo(() => {
    const headline = meta.validation?.headlineRevenue
    const series = meta.validation?.seriesRevenueSum
    const excluded = meta.validation?.excludedRevenue ?? 0
    if (headline === undefined || series === undefined) {
      const status = meta.validation?.status || 'Verified'
      return { status, tone: statusTone(status), delta: null, pct: null }
    }
    const expected = series + excluded
    const delta = Math.abs(headline - expected)
    const pct = headline > 0 ? (delta / headline) * 100 : 0
    if (meta.validation?.seriesSumEqualsHeadline) {
      return { status: meta.validation?.status || 'Reconciled', tone: 'good', delta, pct: 0 }
    }
    if (pct < 0.01) {
      return { status: 'Minor variance', tone: 'warn', delta, pct }
    }
    return { status: 'Mismatch', tone: 'bad', delta, pct }
  }, [meta.validation])

  const operationsScorecard = useMemo(() => {
    const list = report.operations || []
    let met = 0
    list.forEach((op) => {
      if (statusTone(op.status) === 'good') met++
    })
    return { met, total: list.length, items: list }
  }, [report.operations])

  const sortedRecommendations = useMemo(() => {
    const list = report.recommendations || []
    const weight = { high: 0, medium: 1, low: 2 }
    return [...list].sort(
      (a, b) =>
        (weight[a.priority?.toLowerCase()] ?? 1) - (weight[b.priority?.toLowerCase()] ?? 1),
    )
  }, [report.recommendations])

  const recommendationCounts = useMemo(() => {
    const counts = { total: 0, high: 0, medium: 0, low: 0 }
    sortedRecommendations.forEach((r) => {
      counts.total++
      const p = (r.priority || 'medium').toLowerCase()
      if (counts[p] !== undefined) counts[p]++
    })
    return counts
  }, [sortedRecommendations])

  const maxRegionRevenue = useMemo(() => {
    const r = report.regions || []
    if (!r.length) return 1
    return Math.max(...r.map((x) => x.revenue || 0))
  }, [report.regions])

  const maxDeepDiveRevenue = useMemo(() => {
    const r = report.categoryDeepDive || []
    if (!r.length) return 1
    return Math.max(...r.map((x) => x.revenue || 0))
  }, [report.categoryDeepDive])

  const maxCategoryRevenue = useMemo(() => {
    const r = report.categories?.topByRevenue || []
    if (!r.length) return 1
    return Math.max(...r.map((x) => x.revenue || 0))
  }, [report.categories?.topByRevenue])

  const maxGrowthRevenue = useMemo(() => {
    const r = report.categories?.topByGrowth || []
    if (!r.length) return 1
    return Math.max(...r.map((x) => x.revenue || 0))
  }, [report.categories?.topByGrowth])

  const maxUnderperfRevenue = useMemo(() => {
    const r = report.categories?.underperformers || []
    if (!r.length) return 1
    return Math.max(...r.map((x) => x.revenue || 0))
  }, [report.categories?.underperformers])

  const underperfShareUniform = useMemo(() => {
    const list = report.categories?.underperformers || []
    if (list.length < 2) return null
    const firstVal = list[0].sharePct?.toFixed(1)
    const isUniform = list.every((item) => item.sharePct?.toFixed(1) === firstVal)
    return isUniform ? firstVal : null
  }, [report.categories?.underperformers])

  const regionalColumns = useMemo(() => {
    return [
      {
        key: 'rank',
        header: '#',
        width: '7%',
        align: 'left',
        render: (row) => <span className="font-bold text-slate-400">{row.rank}</span>,
      },
      {
        key: 'state',
        header: 'State',
        width: '25%',
        align: 'left',
        render: (row) => (
          <div className="flex items-center gap-1.5 truncate" title={row.name}>
            <span className="truncate font-bold text-slate-900 dark:text-white">
              {row.name}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {row.state}
            </span>
          </div>
        ),
      },
      {
        key: 'revenue',
        header: 'Revenue',
        width: '17%',
        align: 'right',
        render: (row) => {
          const pct = Math.min(100, Math.max(3, (row.revenue / maxRegionRevenue) * 100))
          return (
            <div className="flex flex-col items-end">
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(row.revenue)}
              </span>
              <div className="mt-1 h-[3px] w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        },
      },
      {
        key: 'sharePct',
        header: 'Share',
        width: '9%',
        align: 'right',
        render: (row) => (
          <span className="inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {row.sharePct?.toFixed(1)}%
          </span>
        ),
      },
      {
        key: 'orders',
        header: 'Orders',
        width: '9%',
        align: 'right',
        render: (row) => formatInt(row.orders),
      },
      {
        key: 'avgDeliveryDays',
        header: 'Transit',
        width: '10%',
        align: 'right',
        render: (row) => {
          const pass = row.avgDeliveryDays !== null && row.avgDeliveryDays <= 12
          return (
            <div className="flex items-center justify-end gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${pass ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
              />
              <span>{formatValue(row.avgDeliveryDays, 'days')}</span>
            </div>
          )
        },
      },
      {
        key: 'onTimeRate',
        header: 'On-time',
        width: '10%',
        align: 'right',
        render: (row) => {
          const pass = row.onTimeRate !== null && row.onTimeRate >= 90
          return (
            <div className="flex items-center justify-end gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${pass ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
              />
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatValue(row.onTimeRate, 'percent_2')}
              </span>
            </div>
          )
        },
      },
      {
        key: 'status',
        header: 'Status',
        width: '13%',
        align: 'right',
        render: (row) => <StatusPill status={row.status} />,
      },
    ]
  }, [maxRegionRevenue])

  const deepDiveColumns = useMemo(() => {
    return [
      {
        key: 'rank',
        header: '#',
        width: '7%',
        align: 'left',
        render: (row) => <span className="font-bold text-slate-400">{row.rank}</span>,
      },
      {
        key: 'state',
        header: 'State',
        width: '25%',
        align: 'left',
        render: (row) => (
          <div className="flex items-center gap-1.5 truncate" title={row.name}>
            <span className="truncate font-bold text-slate-900 dark:text-white">
              {row.name}
            </span>
            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-extrabold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {row.state}
            </span>
          </div>
        ),
      },
      {
        key: 'revenue',
        header: 'Revenue',
        width: '17%',
        align: 'right',
        render: (row) => {
          const pct = Math.min(100, Math.max(3, (row.revenue / maxDeepDiveRevenue) * 100))
          return (
            <div className="flex flex-col items-end">
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(row.revenue)}
              </span>
              <div className="mt-1 h-[3px] w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        },
      },
      {
        key: 'sharePct',
        header: 'Share',
        width: '9%',
        align: 'right',
        render: (row) => (
          <span className="inline-block rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {row.sharePct?.toFixed(1)}%
          </span>
        ),
      },
      {
        key: 'orders',
        header: 'Orders',
        width: '9%',
        align: 'right',
        render: (row) => formatInt(row.orders),
      },
      {
        key: 'avgDeliveryDays',
        header: 'Transit',
        width: '10%',
        align: 'right',
        render: (row) => {
          const pass = row.avgDeliveryDays !== null && row.avgDeliveryDays <= 12
          return (
            <div className="flex items-center justify-end gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${pass ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
              />
              <span>{formatValue(row.avgDeliveryDays, 'days')}</span>
            </div>
          )
        },
      },
      {
        key: 'onTimeRate',
        header: 'On-time',
        width: '10%',
        align: 'right',
        render: (row) => {
          const pass = row.onTimeRate !== null && row.onTimeRate >= 90
          return (
            <div className="flex items-center justify-end gap-1.5">
              <span
                className={`h-2 w-2 rounded-full ${pass ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
              />
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {formatValue(row.onTimeRate, 'percent_2')}
              </span>
            </div>
          )
        },
      },
      {
        key: 'status',
        header: 'Status',
        width: '13%',
        align: 'right',
        render: (row) => <StatusPill status={row.status} />,
      },
    ]
  }, [maxDeepDiveRevenue])

  const periodComparisonColumns = useMemo(() => {
    return [
      {
        key: 'metric',
        header: 'Business Metric',
        width: '32%',
        align: 'left',
        render: (row) => <span className="font-bold text-slate-900 dark:text-white">{row.metric}</span>,
      },
      {
        key: 'current',
        header: 'Current Period',
        width: '17%',
        align: 'right',
        render: (row) => row.current || 'N/A',
      },
      {
        key: 'previous',
        header: 'Previous Period',
        width: '17%',
        align: 'right',
        render: (row) => (
          <span className="text-slate-500 dark:text-slate-400">{row.previous || 'N/A'}</span>
        ),
      },
      {
        key: 'change',
        header: 'Change (Abs)',
        width: '17%',
        align: 'right',
        render: (row) => (
          <span
            className={`font-extrabold ${row.isPositive
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-rose-600 dark:text-rose-400'
              }`}
          >
            {row.change || 'N/A'}
          </span>
        ),
      },
      {
        key: 'pct',
        header: 'Change (%)',
        width: '17%',
        align: 'right',
        render: (row) => (
          <span
            className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold ${row.isPositive
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}
          >
            {row.isPositive ? (
              <ArrowUpRight size={13} aria-hidden="true" />
            ) : (
              <ArrowDownRight size={13} aria-hidden="true" />
            )}
            {row.pct || 'N/A'}
          </span>
        ),
      },
    ]
  }, [])

  const yearOverviewColumns = useMemo(() => {
    const rows = report.yearOverview || []
    return [
      {
        key: 'year',
        header: 'Year',
        width: '20%',
        align: 'left',
        render: (row) => (
          <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
            <span>{row.year}</span>
            {row.isPartial && (
              <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-extrabold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                Partial
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'revenue',
        header: 'Revenue',
        width: '25%',
        align: 'right',
        render: (row) => formatCurrency(row.revenue),
      },
      {
        key: 'orders',
        header: 'Orders',
        width: '18%',
        align: 'right',
        render: (row) => formatInt(row.orders),
      },
      {
        key: 'aov',
        header: 'AOV',
        width: '18%',
        align: 'right',
        render: (row) => formatCurrency(row.aov),
      },
      {
        key: 'growthPct',
        header: 'Growth (YoY)',
        width: '19%',
        align: 'right',
        render: (row, idx) => {
          if (row.growthNote) {
            return (
              <span
                title={row.growthNote}
                className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                {row.growthNote.startsWith('n/a') ? 'n/a' : row.growthNote}
              </span>
            )
          }

          const isExorbitant = row.growthPct !== null && row.growthPct > 1000

          if (isExorbitant) {
            return (
              <span
                title="Exorbitant growth"
                className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              >
                n/m
              </span>
            )
          }

          if (row.growthPct === null || row.growthPct === undefined) {
            return <span className="text-xs font-semibold text-slate-400">Baseline</span>
          }

          const isPos = row.growthPct > 0
          return (
            <span
              className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-bold ${isPos
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                }`}
            >
              {isPos ? (
                <ArrowUpRight size={13} aria-hidden="true" />
              ) : (
                <ArrowDownRight size={13} aria-hidden="true" />
              )}
              {isPos ? '+' : ''}
              {row.growthPct.toFixed(1)}%
            </span>
          )
        },
      },
    ]
  }, [report.yearOverview])

  const topCitiesColumns = useMemo(() => {
    return [
      {
        key: 'rank',
        header: '#',
        width: '8%',
        align: 'left',
        render: (row) => <span className="font-bold text-slate-400">{row.rank}</span>,
      },
      {
        key: 'city',
        header: 'City',
        width: '36%',
        align: 'left',
        render: (row) => (
          <span className="font-bold text-slate-900 dark:text-white">
            {humanizeLabel(row.city)}
          </span>
        ),
      },
      {
        key: 'state',
        header: 'State',
        width: '12%',
        align: 'left',
        render: (row) => (
          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {row.state}
          </span>
        ),
      },
      {
        key: 'revenue',
        header: 'Revenue',
        width: '20%',
        align: 'right',
        render: (row) => formatCurrency(row.revenue),
      },
      {
        key: 'orders',
        header: 'Orders',
        width: '12%',
        align: 'right',
        render: (row) => formatInt(row.orders),
      },
      {
        key: 'aov',
        header: 'AOV',
        width: '12%',
        align: 'right',
        render: (row) => formatCurrency(row.aov),
      },
    ]
  }, [])

  const categoryRevenueColumns = useMemo(() => {
    return [
      {
        key: 'rank',
        header: '#',
        width: '8%',
        align: 'left',
        render: (row) => <span className="font-bold text-slate-400">{row.rank}</span>,
      },
      {
        key: 'category',
        header: 'Category',
        width: '38%',
        align: 'left',
        render: (row) => (
          <span className="font-bold text-slate-900 dark:text-white">
            {humanizeLabel(row.category)}
          </span>
        ),
      },
      {
        key: 'revenue',
        header: 'Revenue',
        width: '26%',
        align: 'right',
        render: (row) => {
          const pct = Math.min(100, Math.max(3, (row.revenue / maxCategoryRevenue) * 100))
          return (
            <div className="flex flex-col items-end">
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(row.revenue)}
              </span>
              <div className="mt-1 h-[3px] w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        },
      },
      {
        key: 'sharePct',
        header: 'Share',
        width: '14%',
        align: 'right',
        render: (row) => (
          <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-bold text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
            {row.sharePct?.toFixed(1)}%
          </span>
        ),
      },
      {
        key: 'orders',
        header: 'Orders',
        width: '14%',
        align: 'right',
        render: (row) => formatInt(row.orders),
      },
    ]
  }, [maxCategoryRevenue])

  const categoryGrowthColumns = useMemo(() => {
    return [
      {
        key: 'rank',
        header: '#',
        width: '8%',
        align: 'left',
        render: (row) => <span className="font-bold text-slate-400">{row.rank}</span>,
      },
      {
        key: 'category',
        header: 'Category',
        width: '38%',
        align: 'left',
        render: (row) => (
          <span className="font-bold text-slate-900 dark:text-white">
            {humanizeLabel(row.category)}
          </span>
        ),
      },
      {
        key: 'revenue',
        header: 'Revenue',
        width: '26%',
        align: 'right',
        render: (row) => {
          const pct = Math.min(100, Math.max(3, (row.revenue / maxGrowthRevenue) * 100))
          return (
            <div className="flex flex-col items-end">
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(row.revenue)}
              </span>
              <div className="mt-1 h-[3px] w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-indigo-500 dark:bg-indigo-400"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        },
      },
      {
        key: 'growthPct',
        header: 'Growth',
        width: '14%',
        align: 'right',
        render: (row) => {
          if (row.growthPct === null || row.growthPct === undefined) return 'N/A'
          const isPos = row.growthPct >= 0
          return (
            <span
              className={`font-bold tabular-nums ${isPos
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
                }`}
            >
              {isPos ? '+' : ''}
              {row.growthPct.toFixed(1)}%
            </span>
          )
        },
      },
      {
        key: 'orders',
        header: 'Orders',
        width: '14%',
        align: 'right',
        render: (row) => formatInt(row.orders),
      },
    ]
  }, [maxGrowthRevenue])

  const categoryUnderperfColumns = useMemo(() => {
    const cols = [
      {
        key: 'rank',
        header: '#',
        width: '8%',
        align: 'left',
        render: (row) => <span className="font-bold text-slate-400">{row.rank}</span>,
      },
      {
        key: 'category',
        header: 'Category',
        width: underperfShareUniform ? '48%' : '38%',
        align: 'left',
        render: (row) => (
          <span className="font-bold text-slate-900 dark:text-white">
            {humanizeLabel(row.category)}
          </span>
        ),
      },
      {
        key: 'revenue',
        header: 'Revenue',
        width: '28%',
        align: 'right',
        render: (row) => {
          const pct = Math.min(100, Math.max(3, (row.revenue / maxUnderperfRevenue) * 100))
          return (
            <div className="flex flex-col items-end">
              <span className="font-bold tabular-nums text-slate-900 dark:text-slate-100">
                {formatCurrency(row.revenue)}
              </span>
              <div className="mt-1 h-[3px] w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-rose-400 dark:bg-rose-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )
        },
      },
    ]

    if (!underperfShareUniform) {
      cols.push({
        key: 'sharePct',
        header: comparisonAvailable ? 'Growth' : 'Share',
        width: '13%',
        align: 'right',
        render: (row) => {
          if (comparisonAvailable) {
            if (row.growthPct === null || row.growthPct === undefined) return 'N/A'
            const isPos = row.growthPct >= 0
            return (
              <span
                className={`font-bold tabular-nums ${isPos
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
                  }`}
              >
                {isPos ? '+' : ''}
                {row.growthPct.toFixed(1)}%
              </span>
            )
          }
          return `${row.sharePct?.toFixed(1)}%`
        },
      })
    }

    cols.push({
      key: 'orders',
      header: 'Orders',
      width: '13%',
      align: 'right',
      render: (row) => formatInt(row.orders),
    })

    return cols
  }, [underperfShareUniform, comparisonAvailable, maxUnderperfRevenue])

  const methodologyColumns = useMemo(() => {
    return [
      {
        key: 'name',
        header: 'Metric',
        width: '26%',
        align: 'left',
        render: (row) => (
          <span className="font-bold text-slate-950 dark:text-white">{row.name}</span>
        ),
      },
      {
        key: 'formula',
        header: 'Formula / Specification',
        width: '58%',
        align: 'left',
        render: (row) => (
          <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            {row.formula}
          </code>
        ),
      },
      {
        key: 'unit',
        header: 'Unit',
        width: '16%',
        align: 'right',
        render: (row) => (
          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
            {row.unit}
          </span>
        ),
      },
    ]
  }, [])

  const categorySegments = useMemo(() => {
    const list = report.categories?.topByRevenue || []
    if (list.length === 0) return []
    const top3 = list.slice(0, 3)
    const top3Sum = top3.reduce((acc, c) => acc + (c.sharePct || 0), 0)
    const remaining = Math.max(0, 100 - top3Sum)

    const colors = [
      'bg-indigo-600 dark:bg-indigo-500',
      'bg-violet-500 dark:bg-violet-400',
      'bg-slate-500 dark:bg-slate-400',
      'bg-slate-300 dark:bg-slate-700',
    ]

    const segments = top3.map((c, i) => ({
      label: humanizeLabel(c.category),
      sharePct: c.sharePct || 0,
      color: colors[i],
    }))

    if (remaining > 0) {
      segments.push({
        label: 'Other categories',
        sharePct: remaining,
        color: colors[3],
      })
    }
    return segments
  }, [report.categories?.topByRevenue])

  const { demandSurges, positiveSignals, maxSurgeOrders, hasSurgeChartData } = useMemo(() => {
    const highlights = report.highlights || []
    const surges = []
    const positive = []

    highlights.forEach((hl) => {
      const match = hl.title?.match(/\d{4}-\d{2}-\d{2}/)
      if (match) {
        const parsed = parseSurgeDescription(hl.description)
        surges.push({
          ...hl,
          date: match[0],
          sigma: parsed.sigma,
          peakOrders: parsed.peakOrders,
          baselineOrders: parsed.baselineOrders,
        })
      } else {
        positive.push(hl)
      }
    })

    surges.sort((a, b) => a.date.localeCompare(b.date))

    const maxOrders = surges.reduce((max, s) => Math.max(max, s.peakOrders || 0), 0)
    const chartableSurges = surges.filter(
      (s) => s.peakOrders !== null && s.baselineOrders !== null,
    )

    return {
      demandSurges: surges,
      positiveSignals: positive,
      maxSurgeOrders: maxOrders || 1,
      hasSurgeChartData: chartableSurges.length >= 2,
    }
  }, [report.highlights])

  const showOutliersEmptyBox =
    (!report.anomalies || report.anomalies.length === 0) &&
    (!report.highlights || report.highlights.length === 0)

  const scrollToHeadline = () => {
    const el = document.getElementById('headline')
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <motion.article
      data-print-root
      aria-labelledby="report-title"
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={`@container ${card} space-y-9 rounded-2xl border border-slate-200/90 bg-white/95 px-6 py-7 shadow-md sm:px-8 sm:py-8 dark:border-[#2F2A24] dark:bg-[#1B1814]/95`}
    >
      <motion.div
        variants={getItemVariants(reduce)}
        className="border-b border-slate-200 pb-6 dark:border-[#2F2A24]"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
              {meta.requestedPeriod || 'All time'}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {meta.filters?.category
                ? humanizeLabel(meta.filters.category)
                : 'All categories'}
            </span>
            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {meta.filters?.state || 'All states'}
            </span>
            {scope.isPartialPeriod && (
              <span className="rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                Partial Period Window
              </span>
            )}
          </div>

          <Link
            to={`/dashboard?${dashboardQuery}`}
            className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 shadow-xs hover:bg-indigo-50 dark:border-[#2F2A24] dark:bg-[#211D18] dark:text-indigo-300 dark:hover:bg-slate-800 ${focusRing}`}
          >
            <span>View in Dashboard</span>
            <ExternalLink size={13} aria-hidden="true" />
          </Link>
        </div>

        {scope.sampleSize?.level === 'very_low' && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-300">
            <AlertTriangle size={16} className="shrink-0" />
            <span>
              Very low sample volume ({scope.sampleSize.orders} orders): figures are
              indicative only and exclude statistical anomaly testing.
            </span>
          </div>
        )}

        <h1
          id="report-title"
          className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white"
        >
          {cleanTitle}
        </h1>

        {isNonDefaultScope && (
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            Scope: {scope.label}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold tabular-nums text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-slate-400" />
            <span>Generated: {meta.generatedAt}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar size={14} className="text-slate-400" />
            <span>Effective: {meta.effectivePeriod}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 size={14} className="text-slate-400" />
            <span>Orders audited: {formatInt(meta.totalOrders)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign size={14} className="text-slate-400" />
            <span>Currency: BRL (R$)</span>
          </div>
        </div>
      </motion.div>

      {showSection('summary') && (
        <ReportSection
          id="summary"
          title="Executive Summary"
          icon={Compass}
          index={sectionIndexMap.summary}
          first
        >
          <div className="grid grid-cols-1 gap-3.5 @md:grid-cols-2">
            {report.executiveSummary?.map((item, i) => {
              const isGood = item.tone === 'good'
              const isBad = item.tone === 'bad'
              const Icon = isGood ? CheckCircle2 : isBad ? AlertCircle : Info
              const isHero = i === 0
              const cleanItemText = stripScope(item.text, scope, meta)

              return (
                <div
                  key={i}
                  className={`flex items-start gap-3 rounded-2xl border p-4 shadow-xs ${isHero ? '@md:col-span-2 p-5 bg-gradient-to-br from-indigo-50/70 to-white dark:from-indigo-950/30 dark:to-[#1B1814] border-indigo-200 dark:border-indigo-900/50' : ''
                    } ${!isHero && isGood
                      ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900/40 dark:bg-emerald-950/20'
                      : !isHero && isBad
                        ? 'border-rose-200 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/20'
                        : !isHero
                          ? 'border-slate-200 bg-slate-50/70 dark:border-[#2F2A24] dark:bg-[#211D18]'
                          : ''
                    }`}
                >
                  <Icon
                    size={isHero ? 24 : 20}
                    className={`mt-0.5 shrink-0 ${isGood
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : isBad
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-indigo-600 dark:text-indigo-400'
                      }`}
                    aria-hidden="true"
                  />
                  <div
                    className={
                      isHero
                        ? 'text-[15px] font-bold leading-relaxed text-slate-900 dark:text-white'
                        : 'text-[13.5px] font-semibold leading-relaxed text-slate-900 dark:text-slate-100'
                    }
                  >
                    <RichText text={cleanItemText} showAssumption={false} />
                  </div>
                </div>
              )
            })}
          </div>
        </ReportSection>
      )}

      {showSection('headline') && (
        <ReportSection
          id="headline"
          title="Headline KPIs"
          icon={Gauge}
          index={sectionIndexMap.headline}
        >
          <div className="grid auto-rows-fr grid-cols-1 gap-4 @sm:grid-cols-2 @md:grid-cols-3 @lg:grid-cols-4">
            {report.kpis?.map((kpi) => (
              <KpiCard
                key={kpi.key}
                kpi={kpi}
                comparisonAvailable={comparisonAvailable}
              />
            ))}
          </div>

          {!comparisonAvailable && meta.comparisonReason && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <Info size={15} className="shrink-0 text-indigo-500" />
              <span>Note on comparison: {meta.comparisonReason}</span>
            </div>
          )}

          {comparisonAvailable && meta.comparisonNote && (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs font-semibold text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
              <Info size={15} className="shrink-0" />
              <span>Comparison caveat: {meta.comparisonNote}</span>
            </div>
          )}
        </ReportSection>
      )}

      {showSection('comparison') &&
        comparisonAvailable &&
        report.periodComparison?.length > 0 && (
          <ReportSection
            id="comparison"
            title="Period-over-Period Comparison"
            icon={Layers}
            index={sectionIndexMap.comparison}
          >
            <ReportTable
              columns={periodComparisonColumns}
              rows={report.periodComparison}
              rowKey="metric"
            />
          </ReportSection>
        )}

      {showSection('position') && report.position && (
        <PositionCard position={report.position} />
      )}

      {showSection('trends') && (
        <ReportSection
          id="trends"
          title="Performance Trends"
          icon={TrendingUp}
          index={sectionIndexMap.trends}
        >
          <div className="mb-4 text-[14.5px] leading-relaxed text-slate-900 dark:text-slate-100">
            <MarkdownLite
              text={stripScope(report.trend?.narrative || '', scope, meta)}
            />
          </div>
          <div
            data-chart-capture
            className={`rounded-2xl border bg-slate-50/70 p-4 dark:bg-[#211D18]/50 ${innerBorder}`}
          >
            <TrendAreaChart
              rows={report.trend?.series || []}
              scope={scope}
              granularity={meta.filters?.granularity || 'Month'}
            />
          </div>
        </ReportSection>
      )}

      {showSection('year_overview') && report.yearOverview?.length > 0 && (
        <ReportSection
          id="year_overview"
          title="Year-over-Year Historical Overview"
          icon={CalendarDays}
          index={sectionIndexMap.year_overview}
        >
          <div className="grid grid-cols-1 gap-6 @lg:grid-cols-12">
            <div className="@lg:col-span-8">
              <ReportTable
                columns={yearOverviewColumns}
                rows={report.yearOverview}
                rowKey="year"
              />
            </div>
            <div className="@lg:col-span-4 flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-[#2F2A24] dark:bg-[#211D18]/50">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Annual Revenue Progression
                </p>
                <p className="text-xs font-semibold text-slate-500">
                  Gross delivered BRL per calendar year
                </p>
              </div>
              <div className="h-[140px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.yearOverview} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <XAxis
                      dataKey="year"
                      tick={{ fontSize: 11, fill: '#85877B' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide domain={[0, 'auto']} />
                    <Tooltip
                      formatter={(v) => [formatCurrency(v), 'Revenue']}
                      contentStyle={{
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        border: '1px solid #CDBA9B',
                      }}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {report.yearOverview.map((entry) => (
                        <Cell
                          key={entry.year}
                          fill="#590907"
                          fillOpacity={entry.isPartial ? 0.45 : 0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                <span>Solid = Full Year</span>
                <span className="text-amber-600 font-bold">Muted = Partial Year</span>
              </div>
            </div>
          </div>
        </ReportSection>
      )}

      {showSection('categories') && report.categories && (
        <ReportSection
          id="categories"
          title="Category Performance & Concentration"
          icon={Trophy}
          index={sectionIndexMap.categories}
        >
          <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900/50 dark:bg-indigo-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  Catalog Concentration Ratio
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                  The top 3 categories account for the majority of marketplace revenue.
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                  Top 3 Share
                </span>
                <p className="text-3xl font-black tabular-nums text-indigo-600 dark:text-indigo-400">
                  {report.categories?.top3RevenueSharePct?.toFixed(1) || '0.0'}%
                </p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                {categorySegments.map((seg, idx) => (
                  <div
                    key={idx}
                    className={`h-full ${seg.color}`}
                    style={{ width: `${seg.sharePct}%` }}
                    title={`${seg.label}: ${seg.sharePct.toFixed(1)}%`}
                  />
                ))}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-semibold">
                {categorySegments.map((seg, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className={`h-2.5 w-2.5 rounded-full ${seg.color}`} />
                    <span className="text-slate-700 dark:text-slate-300">{seg.label}</span>
                    <span className="tabular-nums text-slate-500 dark:text-slate-400">
                      ({seg.sharePct.toFixed(1)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Top Categories by Revenue
              </h3>
              <ReportTable
                columns={categoryRevenueColumns}
                rows={report.categories?.topByRevenue || []}
                rowKey="rawCategory"
              />
            </div>

            {comparisonAvailable && report.categories?.topByGrowth?.length > 0 && (
              <div>
                <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Top Categories by Growth Pace
                </h3>
                <ReportTable
                  columns={categoryGrowthColumns}
                  rows={report.categories?.topByGrowth || []}
                  rowKey="rawCategory"
                />
              </div>
            )}

            <div>
              <h3 className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Underperforming Categories (Audited Baseline)
              </h3>
              <ReportTable
                columns={categoryUnderperfColumns}
                rows={report.categories?.underperformers || []}
                rowKey="rawCategory"
                caption={
                  underperfShareUniform
                    ? `Each category accounts for approximately ${underperfShareUniform}% of net sales`
                    : null
                }
              />
            </div>
          </div>
        </ReportSection>
      )}

      {showSection('category_deep_dive') && report.categoryDeepDive?.length > 0 && (
        <ReportSection
          id="category_deep_dive"
          title="Category Regional Distribution (Top 5 States)"
          icon={Building2}
          index={sectionIndexMap.category_deep_dive}
        >
          <ReportTable
            columns={deepDiveColumns}
            rows={report.categoryDeepDive}
            rowKey="state"
          />
        </ReportSection>
      )}

      {showSection('regions') && report.regions?.length > 0 && (
        <ReportSection
          id="regions"
          title="Regional Geography (Top 5 States)"
          icon={MapPin}
          index={sectionIndexMap.regions}
        >
          <ReportTable
            columns={regionalColumns}
            rows={report.regions}
            rowKey="state"
          />
        </ReportSection>
      )}

      {showSection('top_cities') && report.topCities?.length > 0 && (
        <ReportSection
          id="top_cities"
          title="Top Municipal Markets (Cities)"
          icon={MapPin}
          index={sectionIndexMap.top_cities}
        >
          <ReportTable
            columns={topCitiesColumns}
            rows={report.topCities}
            rowKey="city"
          />
        </ReportSection>
      )}

      {showSection('operations') && (
        <ReportSection
          id="operations"
          title="Operations & Customer Health"
          icon={ShieldCheck}
          index={sectionIndexMap.operations}
        >
          <div className="grid auto-rows-fr grid-cols-1 gap-4 @sm:grid-cols-2 @lg:grid-cols-3">
            {report.operations?.map((op) => (
              <OperationCard key={op.name} op={op} />
            ))}

            <div
              className={`relative flex min-h-[175px] h-full flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br from-indigo-50/50 via-white to-white p-4 shadow-xs dark:from-indigo-950/20 dark:via-[#1B1814] dark:to-[#1B1814] ${innerBorder}`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
                    <Target size={15} aria-hidden="true" />
                  </div>
                  <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                    Scorecard
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Target Fulfillment
                </p>
                <p className="mt-0.5 text-2xl font-black text-slate-950 dark:text-white">
                  {operationsScorecard.met} of {operationsScorecard.total} Met
                </p>
              </div>

              <div className="border-t border-slate-100 pt-2.5 dark:border-[#2F2A24]">
                <ul className="space-y-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {operationsScorecard.items.slice(0, 3).map((item) => {
                    const isGood = statusTone(item.status) === 'good'
                    return (
                      <li key={item.name} className="flex items-center justify-between gap-2">
                        <span className="truncate">{item.name}</span>
                        {isGood ? (
                          <Check size={13} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertTriangle size={13} className="shrink-0 text-amber-500" />
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </div>
          </div>
        </ReportSection>
      )}

      {showSection('anomalies') && (
        <ReportSection
          id="anomalies"
          title="Anomalies & Operational Highlights"
          icon={AlertTriangle}
          index={sectionIndexMap.anomalies}
        >
          <div className="space-y-6">
            {report.anomalies?.length > 0 ? (
              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Statistical Volume Outliers & Anomalies
                </h3>
                <ul className="space-y-3">
                  {report.anomalies.map((ano) => (
                    <li
                      key={ano.id}
                      className="flex flex-col gap-1.5 rounded-xl border border-rose-200 bg-rose-50/50 p-4 dark:border-rose-900/40 dark:bg-rose-950/20"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-extrabold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                          {ano.metric} · {ano.subject}
                        </span>
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-extrabold text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">
                          {ano.deviation.toFixed(2)}σ ({ano.severity})
                        </span>
                      </div>
                      <p className="text-[13.5px] font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                        {ano.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : showOutliersEmptyBox ? (
              <div
                className={`rounded-xl border p-4 bg-slate-50/70 text-center dark:bg-[#211D18]/50 ${innerBorder}`}
              >
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  No statistical volume outliers or critical anomalies detected across the evaluated period.
                </p>
              </div>
            ) : null}

            {demandSurges.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Demand Surges & Peak Days
                </h3>

                {hasSurgeChartData && (
                  <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-[#2F2A24] dark:bg-[#211D18]/50">
                    <p className="mb-1 text-xs font-bold text-slate-700 dark:text-slate-300">
                      Surge Volume vs Evaluated Baseline
                    </p>
                    <div className="h-[120px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={demandSurges} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                          <XAxis
                            dataKey="date"
                            tick={{ fontSize: 10, fill: '#85877B' }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis hide domain={[0, 'auto']} />
                          <Tooltip
                            formatter={(v) => [formatInt(v), 'Peak Orders']}
                            contentStyle={{
                              borderRadius: '0.75rem',
                              fontSize: '11px',
                              border: '1px solid #CDBA9B',
                            }}
                          />
                          {demandSurges[0]?.baselineOrders && (
                            <ReferenceLine
                              y={demandSurges[0].baselineOrders}
                              stroke="#85877B"
                              strokeDasharray="3 3"
                            />
                          )}
                          <Bar dataKey="peakOrders" fill="#6B8A4F" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
                  {demandSurges.map((s) => {
                    const sigmaSev =
                      s.sigma !== null && s.sigma >= 10
                        ? 'strong'
                        : s.sigma !== null && s.sigma >= 3
                          ? 'medium'
                          : 'subtle'

                    const barPct = s.peakOrders
                      ? Math.min(100, Math.max(5, (s.peakOrders / maxSurgeOrders) * 100))
                      : 0

                    return (
                      <div
                        key={s.id}
                        className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-extrabold text-slate-800 shadow-xs dark:bg-slate-900 dark:text-slate-200">
                              {s.date}
                            </span>
                            {s.sigma !== null && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[10.5px] font-black tabular-nums ${sigmaSev === 'strong'
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200'
                                  : sigmaSev === 'medium'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200'
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200'
                                  }`}
                              >
                                +{s.sigma.toFixed(2)}σ
                              </span>
                            )}
                          </div>

                          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                            {s.description}
                          </p>
                        </div>

                        <div className="mt-3 border-t border-emerald-200/60 pt-2 dark:border-emerald-900/40">
                          <div className="flex items-center justify-between text-xs font-bold tabular-nums text-emerald-800 dark:text-emerald-300">
                            <span>{s.metric || 'Peak Orders'}</span>
                            <span>{s.value}</span>
                          </div>
                          {barPct > 0 && (
                            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-200/60 dark:bg-emerald-950">
                              <div
                                className="h-full rounded-full bg-emerald-600 dark:bg-emerald-400"
                                style={{ width: `${barPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {positiveSignals.length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                  Positive Operational Signals
                </h3>
                <div className="grid grid-cols-1 gap-3 @sm:grid-cols-2">
                  {positiveSignals.map((hl) => (
                    <div
                      key={hl.id}
                      className="flex flex-col justify-between rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900/40 dark:bg-indigo-950/20"
                    >
                      <div>
                        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
                          <Sparkles size={16} aria-hidden="true" />
                          <p className="text-xs font-extrabold uppercase tracking-wide">
                            {hl.title}
                          </p>
                        </div>
                        <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
                          {hl.description}
                        </p>
                      </div>
                      <p className="mt-2 text-right text-xs font-extrabold tabular-nums text-indigo-700 dark:text-indigo-300">
                        {hl.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ReportSection>
      )}

      {showSection('recommendations') && (
        <ReportSection
          id="recommendations"
          title="Suggested actions (rule-based)"
          icon={Lightbulb}
          index={sectionIndexMap.recommendations}
        >
          <div className="mb-4 flex flex-wrap items-center gap-3 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>{recommendationCounts.total} actions total</span>
            <span>·</span>
            <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              {recommendationCounts.high} High
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              {recommendationCounts.medium} Medium
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-400" />
              {recommendationCounts.low} Low
            </span>
          </div>

          <div className="space-y-4">
            {sortedRecommendations.map((rec, i) => {
              const p = (rec.priority || 'medium').toLowerCase()
              const borderColor =
                p === 'high'
                  ? 'border-l-rose-500'
                  : p === 'medium'
                    ? 'border-l-amber-500'
                    : 'border-l-slate-400'

              return (
                <div
                  key={i}
                  className={`rounded-2xl border border-l-4 ${borderColor} p-5 bg-white/95 shadow-xs dark:bg-[#1B1814] ${innerBorder}`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-400 dark:text-slate-500 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <PriorityPill priority={rec.priority} />
                      <button
                        type="button"
                        onClick={scrollToHeadline}
                        className={`text-xs font-bold text-indigo-600 hover:underline dark:text-indigo-400 ${focusRing}`}
                      >
                        {rec.relatedKpi}
                      </button>
                    </div>
                  </div>

                  <p className="text-[16px] font-extrabold text-slate-950 dark:text-white leading-snug">
                    {rec.action}
                  </p>

                  <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-slate-50 p-3.5 text-xs dark:bg-[#211D18] @md:grid-cols-2">
                    <div>
                      <div className="mb-1 flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <FileCheck size={13} />
                        <span className="font-extrabold uppercase tracking-wider">
                          Evidence
                        </span>
                      </div>
                      <div className="font-medium leading-relaxed text-slate-900 dark:text-slate-200">
                        <RichText text={rec.evidence} showAssumption={false} />
                      </div>
                    </div>
                    <div className="@md:border-l @md:border-slate-200 @md:pl-3.5 dark:@md:border-slate-800">
                      <div className="mb-1 flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <ShieldCheck size={13} />
                        <span className="font-extrabold uppercase tracking-wider">
                          Triggered by
                        </span>
                      </div>
                      <div className="font-medium leading-relaxed text-slate-900 dark:text-slate-200">
                        {rec.basis ? (
                          <RichText text={rec.basis} showAssumption={false} />
                        ) : (
                          <span className="text-slate-500 dark:text-slate-400">
                            Rule-based suggestion
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </ReportSection>
      )}

      {showSection('methodology') && (
        <ReportSection
          id="methodology"
          title="Methodology, Limitations & Scope"
          icon={FileCheck}
          index={sectionIndexMap.methodology}
        >
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-200">
                Metric Definitions & Calculation Rules
              </h3>
              <ReportTable
                columns={methodologyColumns}
                rows={meta.kpiDefinitions || []}
                rowKey="name"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 @sm:grid-cols-2">
              <div
                className={`rounded-xl border p-4 bg-slate-50/70 dark:bg-[#211D18]/50 ${innerBorder}`}
              >
                <p className="mb-2.5 text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Data Scope & Limitations
                </p>
                <ul className="space-y-2 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {meta.limitations?.map((lim, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check size={14} className="mt-0.5 shrink-0 text-indigo-500" />
                      <span>{lim}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className={`rounded-xl border p-4 bg-slate-50/70 dark:bg-[#211D18]/50 ${innerBorder}`}
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    Data Warehouse Validation
                  </p>
                  <StatusPill status={validationReconciliation.status} />
                </div>

                <div className="space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  <table className="w-full text-xs">
                    <tbody>
                      <tr className="border-b border-slate-200/60 dark:border-slate-800">
                        <td className="py-1 text-slate-500">Headline Revenue</td>
                        <td className="py-1 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(meta.validation?.headlineRevenue)}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-200/60 dark:border-slate-800">
                        <td className="py-1 text-slate-500">Series Revenue Sum</td>
                        <td className="py-1 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(meta.validation?.seriesRevenueSum)}
                        </td>
                      </tr>
                      {(meta.validation?.excludedRevenue ?? 0) > 0 && (
                        <tr className="border-b border-slate-200/60 dark:border-slate-800">
                          <td className="py-1 text-slate-500">Excluded Periods Revenue</td>
                          <td className="py-1 text-right font-bold tabular-nums text-amber-700 dark:text-amber-400">
                            {formatCurrency(meta.validation?.excludedRevenue)}
                          </td>
                        </tr>
                      )}
                      <tr className="border-b border-slate-200/60 dark:border-slate-800">
                        <td className="py-1 text-slate-500">Reconciled Total</td>
                        <td className="py-1 text-right font-bold tabular-nums text-slate-900 dark:text-white">
                          {formatCurrency(
                            (meta.validation?.seriesRevenueSum || 0) +
                            (meta.validation?.excludedRevenue || 0),
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1 text-slate-500">Delta Variance</td>
                        <td className="py-1 text-right font-bold tabular-nums text-indigo-600 dark:text-indigo-400">
                          {validationReconciliation.delta !== null
                            ? `${formatCurrency(validationReconciliation.delta)} (${validationReconciliation.pct?.toFixed(3)}%)`
                            : 'N/A'}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <p className="pt-2 text-[11px] text-slate-500">
                    Math Delta Consistency:{' '}
                    {meta.validation?.note && (
                      <p className="pt-1 text-[11px] italic text-amber-700 dark:text-amber-400">
                        {meta.validation.note}
                      </p>
                    )}
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {meta.validation?.mathDeltaConsistencyVerified
                        ? 'Verified within rounding tolerance'
                        : 'Flagged'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ReportSection>
      )}

      <motion.div
        variants={getItemVariants(reduce)}
        className="flex items-center justify-between border-t border-slate-200 pt-5 text-xs font-bold text-slate-500 dark:border-[#2F2A24] dark:text-slate-400"
      >
        <div className="flex items-center gap-1.5">
          <ShieldCheck size={16} className="text-emerald-500" />
          <span>Verified from Olist Data Warehouse (100% SQL Derived)</span>
        </div>
        <span>Executive BI Platform</span>
      </motion.div>
    </motion.article>
  )
}