export const CONTENT_MAX_WIDTH = 1140
export const PAGE_PADDING = 24
export const STUCK_BAR_HEIGHT = 56
export const SECTION_SCROLL_OFFSET = STUCK_BAR_HEIGHT + 20

export const REPORT_SECTION_ORDER = [
  'summary',
  'headline',
  'comparison',
  'position',
  'trends',
  'year_overview',
  'categories',
  'category_deep_dive',
  'regions',
  'top_cities',
  'operations',
  'anomalies',
  'recommendations',
  'methodology',
]

export const SECTION_LABELS = {
  summary: 'Executive Summary',
  headline: 'Headline KPIs',
  comparison: 'Period Comparison',
  position: 'Market Position',
  trends: 'Performance Trends',
  year_overview: 'Year-over-Year',
  categories: 'Category Breakdown',
  category_deep_dive: 'Category Deep-Dive',
  regions: 'Regional Geography',
  top_cities: 'Top Cities',
  operations: 'Operations & Health',
  anomalies: 'Anomalies & Risks',
  recommendations: 'Suggested actions (rule-based)',
  methodology: 'Methodology & Scope',
}

const GOOD = [
  'optimal',
  'sla met',
  'controlled',
  'verified',
  'satisfactory',
  'met',
  'reconciled',
]

const WARN = [
  'warning',
  'breached',
  'attention',
  'high risk',
  'elevated',
  'minor variance',
]

const BAD = [
  'bad',
  'critical',
  'failed',
  'mismatch',
  'breach',
  'action required',
]

export function statusTone(status) {
  const s = String(status || '').toLowerCase()
  if (GOOD.includes(s)) return 'good'
  if (WARN.includes(s)) return 'warn'
  if (BAD.includes(s)) return 'bad'
  return 'info'
}

export function getItemVariants(reduce) {
  return reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
      hidden: { opacity: 0, y: 16 },
      show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
    }
}