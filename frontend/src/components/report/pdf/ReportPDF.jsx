import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'
import { formatCurrency, formatInt, formatValue } from '../../../utils/format'
import { humanizeLabel } from '../../../utils/labels'
import { stripScope } from '../lib/reportText'

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 36,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
    color: '#26231E',
  },
  header: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#CDBA9B',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#26231E',
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 8,
    color: '#6A6C61',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#36332D',
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D2B5',
    textTransform: 'uppercase',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  kpiCard: {
    width: '23.5%',
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8D2B5',
    borderRadius: 4,
    backgroundColor: '#F4EADA',
  },
  kpiLabel: {
    fontSize: 7,
    color: '#85877B',
    textTransform: 'uppercase',
    marginBottom: 3,
    fontWeight: 'bold',
  },
  kpiValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#26231E',
  },
  kpiDelta: {
    fontSize: 7,
    marginTop: 2,
    fontWeight: 'bold',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  summaryCard: {
    width: '48.5%',
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8D2B5',
    borderRadius: 4,
    backgroundColor: '#F4EADA',
  },
  summaryCardHero: {
    width: '100%',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E3CDAE',
    borderRadius: 4,
    backgroundColor: '#F6EEE3',
    marginBottom: 4,
  },
  chartImage: {
    width: '100%',
    height: 140,
    objectFit: 'contain',
    marginVertical: 4,
  },
  table: {
    width: '100%',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#E8D2B5',
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#EDDFC8',
    borderBottomWidth: 1,
    borderBottomColor: '#CDBA9B',
    paddingVertical: 3.5,
    paddingHorizontal: 5,
  },
  tableHeaderCell: {
    fontSize: 7,
    fontWeight: 'bold',
    color: '#4F4F46',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EDDFC8',
    paddingVertical: 3.5,
    paddingHorizontal: 5,
  },
  tableCell: {
    fontSize: 7.5,
    color: '#26231E',
  },
  recItem: {
    padding: 6,
    borderWidth: 1,
    borderColor: '#E8D2B5',
    borderRadius: 4,
    marginBottom: 5,
    backgroundColor: '#F4EADA',
  },
  recHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  recAction: {
    fontSize: 8.5,
    fontWeight: 'bold',
    color: '#26231E',
    marginBottom: 2,
  },
  recEvidence: {
    fontSize: 7,
    color: '#6A6C61',
  },
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    borderTopWidth: 1,
    borderTopColor: '#E8D2B5',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7,
    color: '#85877B',
  },
})

function KpiBox({ kpi, comparisonAvailable }) {
  const fmt =
    kpi.unit === 'BRL'
      ? 'currency'
      : kpi.unit === '%'
        ? 'percent'
        : kpi.unit === 'days'
          ? 'days'
          : kpi.unit === 'score'
            ? 'score'
            : 'number'
  const isPos = (kpi.deltaPct || 0) > 0
  const isGood =
    kpi.direction === 'lower_is_better' ? (kpi.deltaPct || 0) < 0 : isPos

  return (
    <View style={styles.kpiCard}>
      <Text style={styles.kpiLabel}>{kpi.label}</Text>
      <Text style={styles.kpiValue}>{formatValue(kpi.value, fmt)}</Text>
      {comparisonAvailable &&
        kpi.deltaPct !== null &&
        kpi.deltaPct !== undefined ? (
        <Text style={[styles.kpiDelta, { color: isGood ? '#567340' : '#6E1512' }]}>
          {kpi.deltaPct > 0 ? '+' : ''}
          {kpi.deltaPct.toFixed(1)}% vs prev
        </Text>
      ) : kpi.benchmarkValue !== null && kpi.benchmarkValue !== undefined ? (
        <Text style={[styles.kpiDelta, { color: '#470706' }]}>
          {kpi.benchmarkLabel || 'Bmk'}: {formatValue(kpi.benchmarkValue, fmt)}
        </Text>
      ) : (
        <Text style={[styles.kpiDelta, { color: '#85877B' }]}>
          {kpi.subtitle || 'Index'}
        </Text>
      )}
    </View>
  )
}

export function ReportPDF({ report, chartImage }) {
  const meta = report?.meta || {}
  const scope = report?.scope || {}
  const comparisonAvailable = Boolean(scope.comparisonAvailable ?? meta.comparisonAvailable)
  const visible = scope.visibleSections || []

  const show = (id) => visible.length === 0 || visible.includes(id)
  const cleanTitle = stripScope(report.title, scope, meta)

  let sectionCounter = 1
  const getSectionTitle = (title) => `${sectionCounter++}. ${title}`

  const headline = meta.validation?.headlineRevenue
  const series = meta.validation?.seriesRevenueSum
  const delta =
    headline !== undefined && series !== undefined
      ? Math.abs(headline - series)
      : null
  const pct =
    headline !== undefined && series !== undefined && headline > 0
      ? (delta / headline) * 100
      : 0

  let validationText = 'Reconciled (100% exact match)'
  if (!meta.validation?.seriesSumEqualsHeadline) {
    if (pct < 0.01) {
      validationText = `Minor variance (Delta ${formatCurrency(delta)} · ${pct.toFixed(3)}%)`
    } else {
      validationText = `Mismatch (Delta ${formatCurrency(delta)})`
    }
  }

  const demandSurges = (report.highlights || [])
    .filter((hl) => /\d{4}-\d{2}-\d{2}/.test(hl.title || ''))
    .sort((a, b) => a.title.localeCompare(b.title))

  return (
    <Document>
      <Page size="A4" wrap style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{cleanTitle}</Text>
          <Text style={styles.subtitle}>
            Generated: {meta.generatedAt} · Effective: {meta.effectivePeriod} · Orders: {formatInt(meta.totalOrders)} · BRL (R$)
          </Text>
        </View>

        {show('summary') && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{getSectionTitle('Executive Summary')}</Text>
            {report.executiveSummary && report.executiveSummary.length > 0 && (
              <View style={styles.summaryCardHero}>
                <Text style={{ fontSize: 8.5, fontWeight: 'bold', color: '#2A0403' }}>
                  • {stripScope(report.executiveSummary[0].text, scope, meta)}
                </Text>
              </View>
            )}
            <View style={styles.summaryGrid}>
              {report.executiveSummary?.slice(1).map((item, i) => (
                <View key={i} style={styles.summaryCard}>
                  <Text style={{ fontSize: 7.5, color: '#36332D' }}>
                    • {stripScope(item.text, scope, meta)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {show('headline') && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{getSectionTitle('Headline KPIs')}</Text>
            <View style={styles.kpiGrid}>
              {report.kpis?.map((kpi) => (
                <KpiBox
                  key={kpi.key}
                  kpi={kpi}
                  comparisonAvailable={comparisonAvailable}
                />
              ))}
            </View>
          </View>
        )}

        {show('comparison') &&
          comparisonAvailable &&
          report.periodComparison?.length > 0 && (
            <View style={styles.section} wrap={false}>
              <Text style={styles.sectionTitle}>
                {getSectionTitle('Period-over-Period Comparison')}
              </Text>
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Metric</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Current</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Previous</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Change (%)</Text>
                </View>
                {report.periodComparison.map((row, idx) => (
                  <View key={idx} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>{row.metric}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{row.current}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{row.previous}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold', color: row.isPositive ? '#567340' : '#6E1512' }]}>
                      {row.pct}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

        {show('trends') && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>{getSectionTitle('Performance Trends')}</Text>
            <Text style={{ fontSize: 8, color: '#4F4F46', marginBottom: 4 }}>
              {stripScope(report.trend?.narrative || '', scope, meta)}
            </Text>
            {chartImage && <Image src={chartImage} style={styles.chartImage} />}
          </View>
        )}

        {show('year_overview') && report.yearOverview?.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle('Year-over-Year Historical Overview')}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Year</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Orders</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>AOV</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Growth</Text>
              </View>
              {report.yearOverview.map((row, idx) => {
                const prevRow = idx > 0 ? report.yearOverview[idx - 1] : null
                const isPriorIncomplete = prevRow && prevRow.isPartial
                const isExorbitant = row.growthPct !== null && row.growthPct > 1000
                const isNm = isPriorIncomplete || isExorbitant
                const isPos = (row.growthPct || 0) >= 0

                return (
                  <View key={row.year} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>
                      {row.year} {row.isPartial ? '(Partial)' : ''}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(row.revenue)}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatInt(row.orders)}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(row.aov)}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold', color: isNm ? '#85877B' : isPos ? '#567340' : '#6E1512' }]}>
                      {isNm ? 'n/m' : row.growthPct !== null ? `${row.growthPct > 0 ? '+' : ''}${row.growthPct.toFixed(1)}%` : 'Base'}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>
        )}

        {show('categories') && report.categories && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle(`Category Performance (Top 3 Share: ${report.categories?.top3RevenueSharePct?.toFixed(1) || '0.0'}%)`)}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 22 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Top Categories</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Share</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Orders</Text>
              </View>
              {report.categories?.topByRevenue?.map((row) => (
                <View key={row.rawCategory} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 22 }]}>{row.rank}</Text>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>{humanizeLabel(row.category)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(row.revenue)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{row.sharePct?.toFixed(1)}%</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatInt(row.orders)}</Text>
                </View>
              ))}
            </View>

            {report.categories?.underperformers?.length > 0 && (
              <View style={[styles.table, { marginTop: 6 }]}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, { width: 22 }]}>#</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Underperforming Categories</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Share</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Orders</Text>
                </View>
                {report.categories.underperformers.map((row) => (
                  <View key={row.rawCategory} style={styles.tableRow}>
                    <Text style={[styles.tableCell, { width: 22 }]}>{row.rank}</Text>
                    <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>{humanizeLabel(row.category)}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(row.revenue)}</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{row.sharePct?.toFixed(1)}%</Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatInt(row.orders)}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {show('category_deep_dive') && report.categoryDeepDive?.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle('Category Regional Distribution (Top 5 States)')}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 22 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>State Destination</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Share</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Avg Days</Text>
              </View>
              {report.categoryDeepDive.map((st) => (
                <View key={st.state} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 22 }]}>{st.rank}</Text>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>{st.name} ({st.state})</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(st.revenue)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{st.sharePct?.toFixed(1)}%</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatValue(st.avgDeliveryDays, 'days')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {show('regions') && report.regions?.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle('Regional Geography (Top 5 States)')}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 22 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>State Destination</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Share</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Avg Days</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>On-Time</Text>
              </View>
              {report.regions.map((st) => (
                <View key={st.state} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 22 }]}>{st.rank}</Text>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>{st.name} ({st.state})</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(st.revenue)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{st.sharePct?.toFixed(1)}%</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatValue(st.avgDeliveryDays, 'days')}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatValue(st.onTimeRate, 'percent')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {show('top_cities') && report.topCities?.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle('Top Municipal Markets (Cities)')}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 22 }]}>#</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>City</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Revenue</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Orders</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>AOV</Text>
              </View>
              {report.topCities.map((c) => (
                <View key={c.city} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { width: 22 }]}>{c.rank}</Text>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>{humanizeLabel(c.city)} ({c.state})</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(c.revenue)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatInt(c.orders)}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{formatCurrency(c.aov)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {show('operations') && report.operations?.length > 0 && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle('Operations & Customer Health')}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Metric</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Actual</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Target</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Status</Text>
              </View>
              {report.operations.map((op) => (
                <View key={op.name} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 2, fontWeight: 'bold' }]}>{op.name}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                    {op.unit === '%'
                      ? `${op.score.toFixed(1)}%`
                      : op.unit === 'days'
                        ? `${op.score.toFixed(1)} d`
                        : op.score.toFixed(2)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                    {op.unit === '%'
                      ? `${op.target.toFixed(1)}%`
                      : op.unit === 'days'
                        ? `${op.target.toFixed(1)} d`
                        : op.target.toFixed(2)}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: 'bold' }]}>
                    {op.status}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {show('anomalies') && (report.anomalies?.length > 0 || demandSurges.length > 0) && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle('Anomalies & Operational Surges')}
            </Text>
            {report.anomalies?.map((ano) => (
              <View key={ano.id} style={styles.recItem}>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#6E1512' }}>
                  {ano.metric} · {ano.subject} ({ano.deviation.toFixed(2)}σ)
                </Text>
                <Text style={{ fontSize: 7.5, color: '#36332D', marginTop: 1 }}>{ano.description}</Text>
              </View>
            ))}
            {demandSurges.map((s) => (
              <View key={s.id} style={styles.recItem}>
                <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#567340' }}>
                  {s.title} · {s.value}
                </Text>
                <Text style={{ fontSize: 7.5, color: '#36332D', marginTop: 1 }}>{s.description}</Text>
              </View>
            ))}
          </View>
        )}

        {show('recommendations') && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle('Suggested actions (rule-based)')}
            </Text>
            {report.recommendations?.map((rec, i) => (
              <View key={i} style={styles.recItem} wrap={false}>
                <View style={styles.recHeader}>
                  <Text style={{ fontSize: 7.5, fontWeight: 'bold', color: '#470706' }}>
                    [{rec.priority.toUpperCase()}] · {rec.relatedKpi}
                  </Text>
                </View>
                <Text style={styles.recAction}>{rec.action}</Text>
                <Text style={styles.recEvidence}>Evidence: {rec.evidence}</Text>
                {rec.basis ? (
                  <Text style={styles.recEvidence}>Triggered by: {rec.basis}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {show('methodology') && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>
              {getSectionTitle('Methodology & Data Validation')}
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Metric</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Formula / Specification</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Unit</Text>
              </View>
              {meta.kpiDefinitions?.map((d) => (
                <View key={d.name} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1, fontWeight: 'bold' }]}>{d.name}</Text>
                  <Text style={[styles.tableCell, { flex: 2 }]}>{d.formula}</Text>
                  <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{d.unit}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 7, color: '#6A6C61', marginTop: 3 }}>
              Reconciliation Check: Series Sum = Headline · {validationText}
            </Text>
          </View>
        )}

        <View
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) => (
            <>
              <Text>Executive BI Platform · Reconciled Olist DW</Text>
              <Text>Page {pageNumber} of {totalPages}</Text>
            </>
          )}
        />
      </Page>
    </Document>
  )
}

export default ReportPDF