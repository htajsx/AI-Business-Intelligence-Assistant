import { formatCategoryName, formatStateName } from './labels'

export const VALID_PERIODS = [
  'All time',
  'Year 2018',
  'Year 2017',
  'Year 2016',
  'Q4 2017',
  'Q3 2017',
  'Q2 2017',
  'Q1 2017',
]

export const VALID_CATEGORIES = [
  'All categories',
  'Health & Beauty',
  'Watches & Gifts',
  'Bed Bath Table',
  'Sports Leisure',
  'Computers & Accessories',
  'Furniture & Decor',
  'Housewares',
  'Cool Stuff',
  'Auto',
  'Toys',
  'Garden Tools',
]

export const VALID_STATES = [
  'All states',
  'SP',
  'RJ',
  'MG',
  'RS',
  'PR',
  'SC',
  'BA',
  'DF',
]

export const VALID_GRANULARITIES = ['Month', 'Week', 'Quarter']

export const DEFAULT_FILTERS = {
  period: 'All time',
  category: 'All categories',
  state: 'All states',
  granularity: 'Month',
}

export const PERIOD_LABELS = {
  'All time': '2016 – 2018 Full Period',
  'Year 2018': 'Jan 1 – Dec 31, 2018',
  'Year 2017': 'Jan 1 – Dec 31, 2017',
  'Year 2016': 'Sep 1 – Dec 31, 2016',
  'Q4 2017': 'Oct 1 – Dec 31, 2017',
  'Q3 2017': 'Jul 1 – Sep 30, 2017',
  'Q2 2017': 'Apr 1 – Jun 30, 2017',
  'Q1 2017': 'Jan 1 – Mar 31, 2017',
}

export function normalizePeriod(val) {
  if (!val) return 'All time'
  const s = String(val).trim()
  if (s.toLowerCase() === 'all' || s.toLowerCase() === 'all time' || s.includes('Full Period')) {
    return 'All time'
  }
  return s
}

export function normalizeCategory(val) {
  if (!val) return 'All categories'
  const s = String(val).trim()
  if (s.toLowerCase() === 'all' || s.toLowerCase() === 'all categories' || s.toLowerCase() === 'all category') {
    return 'All categories'
  }
  return s
}

export function normalizeState(val) {
  if (!val) return 'All states'
  const s = String(val).trim()
  if (s.toLowerCase() === 'all' || s.toLowerCase() === 'all states' || s.toLowerCase() === 'all state') {
    return 'All states'
  }
  return s.toUpperCase()
}

export function normalizeGranularity(val) {
  if (!val) return 'Month'
  const s = String(val).trim().toLowerCase()
  if (s === 'week') return 'Week'
  if (s === 'quarter') return 'Quarter'
  return 'Month'
}

export function serializeFilters(filters = {}) {
  const p = new URLSearchParams()
  const period = normalizePeriod(filters.period ?? filters.date)
  const category = normalizeCategory(filters.category ?? filters.cat)
  const state = normalizeState(filters.state)
  const granularity = normalizeGranularity(filters.granularity)

  if (period) p.set('period', period)
  if (category) p.set('category', category)
  if (state) p.set('state', state)
  if (granularity) p.set('granularity', granularity)

  return p
}

export function parseFilters(searchParams) {
  const params = searchParams instanceof URLSearchParams ? searchParams : new URLSearchParams(searchParams || '')
  
  const rawPeriod = params.get('period') || params.get('date')
  const rawCategory = params.get('category') || params.get('cat')
  const rawState = params.get('state')
  const rawGranularity = params.get('granularity')

  return {
    period: normalizePeriod(rawPeriod),
    category: normalizeCategory(rawCategory),
    state: normalizeState(rawState),
    granularity: normalizeGranularity(rawGranularity),
  }
}

export function areFiltersEqual(a = {}, b = {}) {
  return (
    normalizePeriod(a.period ?? a.date) === normalizePeriod(b.period ?? b.date) &&
    normalizeCategory(a.category ?? a.cat) === normalizeCategory(b.category ?? b.cat) &&
    normalizeState(a.state) === normalizeState(b.state) &&
    normalizeGranularity(a.granularity) === normalizeGranularity(b.granularity)
  )
}

export function getFiltersLabel(filters = {}) {
  const p = normalizePeriod(filters.period ?? filters.date)
  const c = normalizeCategory(filters.category ?? filters.cat)
  const s = normalizeState(filters.state)

  const parts = []
  if (c !== 'All categories') parts.push(formatCategoryName(c))
  if (s !== 'All states') parts.push(formatStateName(s))
  parts.push(PERIOD_LABELS[p] || p)

  return parts.join(' · ')
}

