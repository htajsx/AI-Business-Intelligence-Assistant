const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function getDashboardData(filters = {}) {
  const params = new URLSearchParams()
  if (filters.date) params.append('period', filters.date)
  if (filters.cat && filters.cat !== 'All Categories') params.append('category', filters.cat)
  if (filters.state && filters.state !== 'All States') params.append('state', filters.state)
  if (filters.granularity) params.append('granularity', filters.granularity)

  const url = `${API_BASE}/api/dashboard?${params.toString()}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch dashboard data (${res.status})`)
  }
  return res.json()
}