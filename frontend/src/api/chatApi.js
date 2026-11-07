const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export async function askQuestion(question, conversationId) {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, message: question, conversation_id: conversationId }),
  })
  if (!res.ok) {
    throw new Error(`Request failed (${res.status})`)
  }
  return res.json()
}