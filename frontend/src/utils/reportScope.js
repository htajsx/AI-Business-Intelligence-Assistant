export const SAMPLE_THRESHOLDS = {
  EMPTY: 0,
  VERY_LOW: 30,
  LOW: 100,
}

export function isSegmentReport(scope) {
  if (!scope) return false
  return scope.categoryMode === 'single' && scope.stateMode === 'single'
}

export function shouldShowSection(scope, sectionId) {
  if (!scope || !Array.isArray(scope.visibleSections)) return true
  return scope.visibleSections.includes(sectionId)
}

export function getScopeTitle(scope) {
  if (!scope?.label) return 'Executive KPI Report'
  return `Executive KPI Performance Report — ${scope.label}`
}

export function getSampleBannerLevel(scope) {
  if (!scope?.sampleSize?.level) return null
  const lvl = scope.sampleSize.level
  if (lvl === 'empty' || lvl === 'very_low' || lvl === 'low') {
    return lvl
  }
  return null
}

export function isComparisonAvailable(scope) {
  return Boolean(scope?.comparisonAvailable)
}

