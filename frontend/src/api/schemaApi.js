const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function getSchema() {
  const res = await fetch(`${API_BASE}/api/schema`)
  if (!res.ok) {
    throw new Error(`Failed to load schema (${res.status})`)
  }
  return res.json()
}