const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function generateReport(filters = {}, signal = null) {
  const res = await fetch(`${API_BASE}/api/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(filters),
    signal,
  })
  if (!res.ok) {
    throw new Error(`Report generation failed (${res.status})`)
  }
  return res.json()
}
