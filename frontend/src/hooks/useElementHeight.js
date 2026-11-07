import { useLayoutEffect, useState } from 'react'

/**
 * Tracks the rendered (border-box) height of an element.
 * Pass a ref object; returns 0 until the element is mounted and measured.
 */
export default function useElementHeight(ref) {
  const [height, setHeight] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const update = () => setHeight(Math.round(el.getBoundingClientRect().height))
    update()

    if (typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref])

  return height
}
