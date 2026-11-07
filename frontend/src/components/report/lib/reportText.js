function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function stripScope(text, scope = {}, meta = {}) {
  if (!text || typeof text !== 'string') return text

  let result = text

  const candidates = [
    scope?.label,
    meta?.requestedPeriod,
    meta?.effectivePeriod,
    'All time · All categories · All states',
    'All categories · All states · All time',
  ].filter(Boolean)

  for (const raw of candidates) {
    const trimmed = raw.trim()
    if (!trimmed) continue
    const escaped = escapeRegex(trimmed)

    result = result.replace(new RegExp(`\\s*(?:—|-)\\s*${escaped}\\s*$`, 'i'), '')
    result = result.replace(new RegExp(`\\s+(?:under|for|across)\\s+${escaped}`, 'gi'), '')
  }

  result = result
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/,\s*,/g, ',')
    .replace(/\(\s*\)/g, '')
    .trim()

  return result || text
}

