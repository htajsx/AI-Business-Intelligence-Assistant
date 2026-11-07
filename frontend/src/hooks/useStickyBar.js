import { useCallback, useEffect, useLayoutEffect, useState } from 'react'

export function useStickyBar({
  scrollRoot = null,
  barRef,
  wrapperRef,
  sentinelRef,
  contentMaxWidth = 1140,
  pagePadding = 24,
}) {
  const [stuck, setStuck] = useState(false)
  const [gutter, setGutter] = useState(null)
  const [lockedHeight, setLockedHeight] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  const measureGutter = useCallback(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const width = wrapper.clientWidth
    const centeringOffset = (width - Math.min(width, contentMaxWidth)) / 2
    setGutter(Math.max(0, Math.round(centeringOffset + pagePadding)))
  }, [contentMaxWidth, pagePadding, wrapperRef])

  useLayoutEffect(() => {
    measureGutter()
    const wrapper = wrapperRef.current
    if (!wrapper || typeof ResizeObserver === 'undefined') return undefined
    const observer = new ResizeObserver(measureGutter)
    observer.observe(wrapper)
    window.addEventListener('resize', measureGutter)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measureGutter)
    }
  }, [measureGutter, wrapperRef])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      ([entry]) => {
        const rootTop = entry.rootBounds ? entry.rootBounds.top : 0
        const nextStuck = !entry.isIntersecting && entry.boundingClientRect.top < rootTop
        if (nextStuck && barRef.current) {
          const measured = Math.round(barRef.current.getBoundingClientRect().height)
          setLockedHeight((prev) => Math.max(prev, measured))
        }
        setStuck(nextStuck)
      },
      { root: scrollRoot, threshold: [0, 1] },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [scrollRoot, sentinelRef, barRef])

  useEffect(() => {
    let ticking = false
    const target = scrollRoot || window

    const updateProgress = () => {
      const current = scrollRoot
        ? scrollRoot.scrollTop
        : (window.scrollY || document.documentElement.scrollTop)
      const total = scrollRoot
        ? (scrollRoot.scrollHeight - scrollRoot.clientHeight)
        : (document.documentElement.scrollHeight - window.innerHeight)

      const p = total > 0 ? Math.min(1, Math.max(0, current / total)) : 0
      setScrollProgress(p)
      ticking = false
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(updateProgress)
      }
    }

    updateProgress()
    target.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      target.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [scrollRoot])

  return { stuck, gutter, lockedHeight, scrollProgress }
}

export default useStickyBar
