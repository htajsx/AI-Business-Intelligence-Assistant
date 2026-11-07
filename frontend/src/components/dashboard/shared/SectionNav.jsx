import { useEffect, useState } from 'react'
import { focusRing } from '../../../utils/ui'

export const SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'sales', label: 'Sales' },
  { id: 'operations', label: 'Operations' },
  { id: 'customer', label: 'Customer' },
  { id: 'regions', label: 'Regions' },
  { id: 'insights', label: 'AI Insights' }
]

export default function SectionNav({ scrollRoot }) {
  const [active, setActive] = useState(SECTIONS[0].id)

  useEffect(() => {
    if (!scrollRoot) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id)
      },
      { root: scrollRoot, rootMargin: '-120px 0px -60% 0px', threshold: 0 }
    )
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [scrollRoot])

  const go = (id) => {
    const el = document.getElementById(id)
    if (!el || !scrollRoot) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const top = el.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top + scrollRoot.scrollTop - 112
    scrollRoot.scrollTo({ top, behavior: reduce ? 'auto' : 'smooth' })
    setActive(id)
  }

  return (
    <nav aria-label="Dashboard sections" className="thin-scroll flex gap-2 overflow-x-auto py-0.5">
      {SECTIONS.map((s) => (
        <button
          key={s.id}
          type="button"
          onClick={() => go(s.id)}
          aria-current={active === s.id ? 'true' : undefined}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${focusRing} ${
            active === s.id
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          {s.label}
        </button>
      ))}
    </nav>
  )
}
