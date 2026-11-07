import { useCallback, useEffect, useRef, useState } from 'react'
import { generateReport } from '../api/reportApi'

export const PHASES = [
  { id: 'queries', label: 'Running KPI queries', doneLabel: 'Running KPI queries (7/7)' },
  { id: 'trends', label: 'Computing trends & outliers' },
  { id: 'narrative', label: 'Drafting narrative' },
  { id: 'format', label: 'Formatting report' },
]

const PHASE_INTERVAL = 1200

export default function useReport(initialReport = null) {
  const [status, setStatus] = useState(() => (initialReport ? 'ready' : 'idle'))
  const [report, setReport] = useState(initialReport)
  const [error, setError] = useState(null)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const lastFilters = useRef(null)
  const abortCtrlRef = useRef(null)

  useEffect(() => {
    if (status !== 'generating') return undefined
    const timer = setInterval(() => {
      setPhaseIndex((i) => Math.min(i + 1, PHASES.length - 1))
    }, PHASE_INTERVAL)
    return () => clearInterval(timer)
  }, [status])

  const generate = useCallback(async (filters) => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort()
    }
    const ctrl = new AbortController()
    abortCtrlRef.current = ctrl

    lastFilters.current = filters
    setPhaseIndex(0)
    setError(null)
    setStatus('generating')

    try {
      const data = await generateReport(filters, ctrl.signal)
      if (abortCtrlRef.current === ctrl) {
        setReport(data)
        setStatus('ready')
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        if (abortCtrlRef.current === ctrl) {
          setStatus('idle')
        }
        return
      }
      if (abortCtrlRef.current === ctrl) {
        setError(err.message || 'Something went wrong while generating the report.')
        setStatus('error')
      }
    }
  }, [])

  const retry = useCallback(() => {
    if (lastFilters.current) generate(lastFilters.current)
  }, [generate])

  const reset = useCallback(() => {
    if (abortCtrlRef.current) {
      abortCtrlRef.current.abort()
    }
    setReport(null)
    setError(null)
    setPhaseIndex(0)
    setStatus('idle')
  }, [])

  return { status, report, error, phaseIndex, generate, retry, reset, setReport }
}
