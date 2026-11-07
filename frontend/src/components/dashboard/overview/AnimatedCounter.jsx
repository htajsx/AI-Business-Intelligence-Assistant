import { useState, useEffect, useRef } from 'react'

function easeOutExpo(x) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
}

function formatDisplay(val, format, decimals) {
  if (val === null || val === undefined || isNaN(val)) {
    return 'No data'
  }
  if (format === 'currency') {
    return `R$ ${Math.round(val).toLocaleString('en-US')}`
  }
  if (format === 'percent') {
    return `${val.toFixed(decimals ?? 1)}%`
  }
  if (format === 'score') {
    return val.toFixed(decimals ?? 2)
  }
  if (format === 'days') {
    return `${val.toFixed(decimals ?? 2)}d`
  }
  return Math.round(val).toLocaleString('en-US')
}

export default function AnimatedCounter({ value, format = 'number', decimals, duration = 1200, triggerKey }) {
  const [displayValue, setDisplayValue] = useState(0)
  const prevValueRef = useRef(0)
  const frameRef = useRef(null)

  useEffect(() => {
    if (value === null || value === undefined || isNaN(value)) {
      setDisplayValue(null)
      return
    }

    const startVal = typeof prevValueRef.current === 'number' ? prevValueRef.current : 0
    const endVal = typeof value === 'number' ? value : 0
    prevValueRef.current = endVal
    const startTime = performance.now()

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }

    const step = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easeOutExpo(progress)
      const current = startVal + (endVal - startVal) * easedProgress

      setDisplayValue(current)

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step)
      } else {
        setDisplayValue(endVal)
        prevValueRef.current = endVal
      }
    }

    frameRef.current = requestAnimationFrame(step)

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [value, duration, triggerKey])

  if (value === null || value === undefined) {
    return <span className="text-sm font-semibold text-slate-400">No data available</span>
  }

  return (
    <span className="tabular-nums font-bold tracking-tight">
      {formatDisplay(displayValue, format, decimals)}
    </span>
  )
}
