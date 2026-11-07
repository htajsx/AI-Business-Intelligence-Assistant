import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { RefreshCw, WifiOff } from 'lucide-react'
import gsap from 'gsap'
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import AppLayout from '../components/layout/AppLayout'
import RightRail from '../components/layout/RightRail'
import FilterBar from '../components/dashboard/filters/FilterBar'
import ChartCard from '../components/dashboard/shared/ChartCard'
import ChartRenderer from '../components/charts/renderer/ChartRenderer'
import RankingsAndAnalytics from '../components/dashboard/analytics/RankingsAndAnalytics'
import InsightPanel from '../components/dashboard/insights/InsightPanel'
import DataFooter from '../components/layout/DataFooter'
import RevenueTrajectoryChart from '../components/dashboard/sales/RevenueTrajectoryChart'
import DashboardLoader from '../components/dashboard/shared/DashboardLoader'
import KpiSection from '../components/dashboard/overview/KpiSection'
import DashboardSection from '../components/dashboard/shared/DashboardSection'
import SectionNav from '../components/dashboard/shared/SectionNav'
import CategoryMixList from '../components/dashboard/sales/CategoryMixList'
import DeliverySlaChart from '../components/dashboard/operations/DeliverySlaChart'
import SatisfactionTrendChart from '../components/dashboard/customer/SatisfactionTrendChart'
import RatingExtremesCard from '../components/dashboard/customer/RatingExtremesCard'
import StateDetailCard from '../components/dashboard/regions/StateDetailCard'
import BrazilOrdersMap from '../components/dashboard/regions/BrazilOrdersMap'
import useElementHeight from '../hooks/useElementHeight'
import { getDashboardData } from '../api/dashboardApi'
import { useConnection } from '../context/ConnectionContext'
import { useChatContext } from '../context/ChatContext'
import { parseFilters } from '../utils/filterParams'
import { focusRing } from '../utils/ui'
import { useIsDarkMode } from '../utils/theme'
import { compact, formatInt, formatCurrency, isNum } from '../utils/format'
import { getGridColor, getTickColor } from '../components/charts/shared/chartTheme'

const CACHE_DATA_KEY = 'last_dashboard_data'
const CACHE_FILTERS_KEY = 'last_dashboard_filters'

function readCache(key) {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(key, value) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    void e
  }
}

function OrdersAovTip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const point = payload[0]?.payload
  const orders = payload.find((p) => p.dataKey === 'orders')?.value
  const aov = payload.find((p) => p.dataKey === 'aov')?.value
  return (
    <div className="rounded-xl border border-slate-200 bg-white/95 p-3 text-xs font-semibold shadow-xl backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
      <p className="mb-1.5 border-b border-slate-100 pb-1 font-bold text-slate-900 dark:border-slate-800 dark:text-slate-100">
        Period: {label || point?.period}
      </p>
      <div className="space-y-1">
        <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
          <span>Orders:</span>
          <span className="font-bold tabular-nums text-indigo-600 dark:text-indigo-400">{formatInt(orders)}</span>
        </p>
        <p className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300">
          <span>AOV:</span>
          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{formatCurrency(aov)}</span>
        </p>
      </div>
    </div>
  )
}

function OrdersAovChart({ rows, triggerKey }) {
  const isDark = useIsDarkMode()
  const data = (Array.isArray(rows) ? rows : []).map((r) => ({
    period: r.month ?? r.period,
    orders: isNum(r.orders) ? r.orders : null,
    aov: isNum(r.orders) && r.orders > 0 && isNum(r.revenue) ? r.revenue / r.orders : null
  }))
  if (!data.some((r) => r.orders !== null)) return null
  const grid = getGridColor(isDark)
  const tick = getTickColor(isDark)
  return (
    <div className="relative min-h-[270px] w-full flex-1">
      <div className="absolute inset-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart key={`oa-${triggerKey}`} data={data} margin={{ top: 12, right: 6, left: -10, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={grid} />
            <XAxis
              dataKey="period"
              interval="preserveStartEnd"
              minTickGap={32}
              axisLine={false}
              tickLine={false}
              tick={{ fill: tick, fontSize: 11, fontWeight: 600 }}
              dy={6}
            />
            <YAxis yAxisId="o" axisLine={false} tickLine={false} tick={{ fill: tick, fontSize: 11, fontWeight: 500 }} tickFormatter={(v) => compact(Math.round(v))} width={44} />
            <YAxis yAxisId="a" orientation="right" axisLine={false} tickLine={false} tick={{ fill: tick, fontSize: 11, fontWeight: 500 }} tickFormatter={(v) => Math.round(v)} width={44} />
            <Tooltip content={<OrdersAovTip />} cursor={{ stroke: tick, strokeWidth: 1, strokeDasharray: '3 3' }} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
            <Bar yAxisId="o" dataKey="orders" name="Orders" fill="#590907" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Line yAxisId="a" type="monotone" dataKey="aov" name="AOV (R$)" stroke="#6B8A4F" strokeWidth={2.4} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function periodsNote(meta) {
  const parts = []
  if (Array.isArray(meta?.excludedPeriods) && meta.excludedPeriods.length > 0) {
    parts.push(`Periods with fewer than ${meta.minOrdersPerPeriod ?? 'N'} orders are excluded: ${meta.excludedPeriods.join(', ')}`)
  }
  if (meta?.partialPeriod) parts.push(`Partial period: ${meta.partialPeriod}`)
  return parts.length > 0 ? parts.join('. ') : null
}

function resolveInitialFilters(locationSearch) {
  if (locationSearch) {
    const parsed = parseFilters(locationSearch)
    return {
      date: parsed.period,
      cat: parsed.category === 'All categories' ? 'All Categories' : parsed.category,
      state: parsed.state === 'All states' ? 'All States' : parsed.state,
      granularity: parsed.granularity,
    }
  }
  const cached = readCache(CACHE_FILTERS_KEY)
  if (cached) return cached
  return { date: 'All time', cat: 'All Categories', state: 'All States', granularity: 'Month' }
}

export default function DashboardPage() {
  const location = useLocation()

  const [filters, setFilters] = useState(() => resolveInitialFilters(location.search))

  const [data, setData] = useState(() => {
    const cached = readCache(CACHE_DATA_KEY)
    return cached?.data ?? null
  })

  const [loading, setLoading] = useState(() => {
    const cached = readCache(CACHE_DATA_KEY)
    return !cached?.data
  })

  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [triggerKey, setTriggerKey] = useState(1)
  const [scrollRoot, setScrollRoot] = useState(null)

  const { setConnected } = useConnection()
  const { openRailAndAsk, setAppliedFilters } = useChatContext()
  const containerRef = useRef(null)
  const ordersByStateRef = useRef(null)
  const ordersByStateHeight = useElementHeight(ordersByStateRef)
  const navigate = useNavigate()

  const handleAsk = (question) => openRailAndAsk(question)

  const loadData = useCallback(async (activeFilters) => {
    setLoading(true)
    setError(null)
    try {
      const result = await getDashboardData(activeFilters)
      setData(result)
      setConnected(true)
      setAppliedFilters(activeFilters)
      setTriggerKey((prev) => prev + 1)
      writeCache(CACHE_DATA_KEY, { data: result })
      writeCache(CACHE_FILTERS_KEY, activeFilters)
    } catch (err) {
      setError(err)
      setConnected(false)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [setConnected, setAppliedFilters])

  useEffect(() => {
    const cached = readCache(CACHE_DATA_KEY)
    if (cached?.data) return
    loadData(filters)
  }, [])

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    const ctx = gsap.context(() => {
      gsap.fromTo('.dash-header', { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out' })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  const handleFilterApply = (newFilters) => {
    setFilters(newFilters)
    writeCache(CACHE_FILTERS_KEY, newFilters)
    loadData(newFilters)
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadData(filters)
  }

  const series = data?.series
  const tables = data?.tables
  const meta = data?.meta
  const note = periodsNote(meta)
  const states = tables?.top_states
  const topCats = series?.top_categories
  const isAllCategories = !filters.cat || filters.cat === 'All Categories'

  return (
    <AppLayout rail={<RightRail onPick={handleAsk} onNewChat={() => navigate('/')} />}>
      <div
        ref={(node) => {
          containerRef.current = node
          if (node && scrollRoot !== node) setScrollRoot(node)
        }}
        className="thin-scroll h-full overflow-y-auto bg-white dark:bg-slate-950"
      >
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
          <div className="dash-header mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 sm:text-3xl lg:text-4xl">Executive Dashboard</h1>
              <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">
                Olist E-Commerce Performance Overview · 2016 – 2018 Warehouse Period
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleAsk('What are the top 3 actionable insights and revenue opportunities from this dashboard?')}
              className={`rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-700 shadow-sm transition-all hover:bg-indigo-50 active:scale-95 dark:border-indigo-500/30 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-slate-800 ${focusRing}`}
            >
              Ask in Chat
            </button>
          </div>
        </div>

        <FilterBar
          scrollRoot={scrollRoot}
          activeFilters={filters}
          onApply={handleFilterApply}
          onRefresh={handleRefresh}
          isRefreshing={refreshing}
        >
          <SectionNav scrollRoot={scrollRoot} />
        </FilterBar>

        <div className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
          {error && (
            <div className="mt-4 flex flex-col justify-between gap-4 rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400">
                  <WifiOff size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-rose-900 dark:text-rose-200">Database &amp; Backend Offline</h4>
                  <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300/90">
                    Unable to connect to the backend server at localhost:8000. All metrics below require active database connection.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => loadData(filters)}
                className={`flex shrink-0 items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-rose-700 active:scale-95 ${focusRing}`}
              >
                <RefreshCw size={12} />
                <span>Reconnect Database</span>
              </button>
            </div>
          )}

          {loading ? (
            <div className="mt-6"><DashboardLoader /></div>
          ) : (
            <div className="mt-6 space-y-10">
              <DashboardSection id="overview" title="Overview" description="How is the business doing?" scrollRoot={scrollRoot}>
                <KpiSection data={data} triggerKey={triggerKey} scrollRoot={scrollRoot} />
              </DashboardSection>

              <DashboardSection id="sales" title="Sales Performance" description="Where does revenue come from and how is it trending?" scrollRoot={scrollRoot}>
                <div className="space-y-5">
                  <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
                    <div className="lg:col-span-8">
                      <ChartCard
                        title="Revenue Trajectory"
                        subtitle="Total net revenue calculated from delivered items, excluding multi-payment duplications."
                        footnote={[meta?.movingAvg3Definition ?? meta?.targetDefinition, note].filter(Boolean).join(' · ') || null}
                        onAsk={handleAsk}
                        hasData={Array.isArray(series?.revenue_over_time) && series.revenue_over_time.length > 0}
                        className="h-[440px]"
                      >
                        <RevenueTrajectoryChart rows={series?.revenue_over_time || []} triggerKey={triggerKey} />
                      </ChartCard>
                    </div>
                    <div className="lg:col-span-4">
                      <ChartCard
                        title="Category Revenue Mix"
                        subtitle={isAllCategories ? "Share of net revenue" : "Category revenue share"}
                        onAsk={handleAsk}
                        hasData={Array.isArray(series?.category_distribution) && series.category_distribution.length > 0}
                        className={isAllCategories ? "h-[440px]" : "h-auto self-start"}
                        minHeight={isAllCategories ? "min-h-[440px]" : "min-h-0"}
                      >
                        <CategoryMixList
                          rows={series?.category_distribution}
                          isSingleCategory={!isAllCategories}
                          totalRevenue={data?.kpis?.find((k) => k.id === 'revenue')?.value}
                        />
                      </ChartCard>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
                    <div className={isAllCategories ? "lg:col-span-6 flex flex-col h-full" : "lg:col-span-12 flex flex-col h-full"}>
                      <ChartCard
                        title="Orders and AOV"
                        subtitle="Order count against average ticket"
                        onAsk={handleAsk}
                        footnote={note}
                        hasData={Array.isArray(series?.revenue_over_time) && series.revenue_over_time.length > 0}
                        className="h-full min-h-[380px]"
                      >
                        <OrdersAovChart rows={series?.revenue_over_time} triggerKey={triggerKey} />
                      </ChartCard>
                    </div>
                    {isAllCategories && (
                      <div className="lg:col-span-6 flex flex-col h-full">
                        <ChartCard
                          title="Top 10 Categories"
                          subtitle="Net revenue ranking"
                          onAsk={handleAsk}
                          hasData={Array.isArray(topCats) && topCats.length > 0}
                          className="h-full min-h-[380px]"
                        >
                          <ChartRenderer
                            spec={{ type: 'horizontal_bar', x: 'category', y: 'revenue', title: '', yFormat: 'currency', barName: 'Net Revenue' }}
                            rows={topCats || []}
                            triggerKey={`cat-${triggerKey}`}
                            fillHeight
                          />
                        </ChartCard>
                      </div>
                    )}
                  </div>
                </div>
              </DashboardSection>

              <DashboardSection id="operations" title="Delivery and Operations" description="Are we delivering on our promise?" scrollRoot={scrollRoot}>
                <ChartCard
                  title="Delivery vs 12-day target"
                  subtitle="Average days from purchase to delivery"
                  onAsk={handleAsk}
                  footnote={note}
                  hasData={Array.isArray(series?.delivery_performance) && series.delivery_performance.length > 0}
                >
                  <DeliverySlaChart rows={series?.delivery_performance} triggerKey={triggerKey} />
                </ChartCard>
              </DashboardSection>

              <DashboardSection id="customer" title="Customer" description="Are customers satisfied and coming back?" scrollRoot={scrollRoot}>
                <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
                  <div className="lg:col-span-8 flex flex-col h-full">
                    <ChartCard
                      title="Satisfaction Trend"
                      subtitle="Monthly average review score"
                      onAsk={handleAsk}
                      footnote={note}
                      hasData={Array.isArray(series?.satisfaction_trend) && series.satisfaction_trend.length > 0}
                      className="h-full min-h-[360px]"
                    >
                      <SatisfactionTrendChart rows={series?.satisfaction_trend} triggerKey={triggerKey} />
                    </ChartCard>
                  </div>
                  <div className="lg:col-span-4 flex flex-col h-full">
                    <ChartCard
                      title="Rating Extremes"
                      subtitle="5-star to 1-star customer rating distribution"
                      hasData={Array.isArray(series?.satisfaction_trend) && series?.satisfaction_trend.length > 0}
                      className="h-full min-h-[360px]"
                    >
                      <RatingExtremesCard rows={series?.satisfaction_trend} />
                    </ChartCard>
                  </div>
                </div>
              </DashboardSection>

              <DashboardSection id="regions" title="Regions" description="Which regions perform best and which are slow?" scrollRoot={scrollRoot}>
                <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
                  <div ref={ordersByStateRef} className="lg:col-span-7 flex flex-col h-full">
                    <ChartCard
                      title="Orders by State"
                      subtitle="Order volume by customer state"
                      onAsk={handleAsk}
                      hasData={Array.isArray(states) && states.length > 0}
                      className="h-full min-h-[420px]"
                    >
                      <BrazilOrdersMap states={states} />
                    </ChartCard>
                  </div>
                  <div className="lg:col-span-5 flex flex-col h-full">
                    <StateDetailCard states={states} matchHeight={ordersByStateHeight} />
                  </div>
                </div>
              </DashboardSection>

              <DashboardSection id="insights" title="Auto Insights and Actions" description="What should we do next?" scrollRoot={scrollRoot}>
                {data?.insights && <InsightPanel insights={data.insights} onAskAi={handleAsk} />}
              </DashboardSection>

              <DashboardSection id="analytics" title="Performance Rankings & Diagnostic Analytics" description="Rankings, bottlenecks and statistical anomalies for the selected scope." scrollRoot={scrollRoot}>
                {tables && (
                  <RankingsAndAnalytics
                    categories={tables.top_categories || []}
                    states={tables.top_states || []}
                    bottomPerformers={tables.bottom_performers || []}
                    anomalies={tables.anomalies || []}
                    periodComparison={tables.period_comparison || []}
                    comparisonAvailable={meta?.comparisonAvailable}
                    onAsk={handleAsk}
                  />
                )}
                <DataFooter meta={meta || {}} />
              </DashboardSection>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
}