import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { focusRing } from '../../../utils/ui'
import {
  REPORT_SECTION_ORDER,
  SECTION_LABELS,
  STUCK_BAR_HEIGHT,
} from '../lib/reportLayout'

export { SECTION_LABELS }

const LOCK_DURATION = 700

export default function ReportOutline({ visibleSections = [] }) {
  const reduce = useReducedMotion()

  const sections = useMemo(() => {
    const set = new Set(visibleSections.length > 0 ? visibleSections : Object.keys(SECTION_LABELS))
    return REPORT_SECTION_ORDER.filter((id) => set.has(id) && SECTION_LABELS[id]).map(
      (id, index) => ({
        id,
        label: SECTION_LABELS[id],
        number: String(index + 1).padStart(2, '0'),
      }),
    )
  }, [visibleSections])

  const [active, setActive] = useState(sections[0]?.id)
  const lockRef = useRef(false)

  useEffect(() => {
    if (!sections.length) return undefined

    const computeActive = () => {
      if (lockRef.current) return

      const scrollRoot = document.querySelector('[data-report-scroll]')
      const rootTop = scrollRoot ? scrollRoot.getBoundingClientRect().top : 0

      if (
        scrollRoot &&
        Math.ceil(scrollRoot.scrollTop + scrollRoot.clientHeight) >=
          scrollRoot.scrollHeight - 6
      ) {
        setActive(sections[sections.length - 1].id)
        return
      }

      let current = sections[0].id
      for (const section of sections) {
        const el = document.getElementById(section.id)
        if (!el) continue
        const top = el.getBoundingClientRect().top - rootTop
        if (top <= STUCK_BAR_HEIGHT + 32) {
          current = section.id
        } else {
          break
        }
      }
      setActive(current)
    }

    computeActive()

    const scrollRoot = document.querySelector('[data-report-scroll]')
    const target = scrollRoot || window
    target.addEventListener('scroll', computeActive, { passive: true })
    window.addEventListener('resize', computeActive)

    return () => {
      target.removeEventListener('scroll', computeActive)
      window.removeEventListener('resize', computeActive)
    }
  }, [sections])

  const handleClick = (id) => {
    setActive(id)
    lockRef.current = true

    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })

    window.setTimeout(() => {
      lockRef.current = false
    }, reduce ? 0 : LOCK_DURATION)
  }

  return (
    <motion.aside
      data-no-print
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut', delay: 0.2 }}
      className="hidden w-[200px] shrink-0 xl:block"
    >
      <nav
        aria-label="Report Table of Contents"
        style={{ top: STUCK_BAR_HEIGHT + 24 }}
        className="sticky"
      >
        <p className="mb-3.5 text-[11px] font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
          Document Outline
        </p>

        <div className="relative border-l border-slate-200 pl-3 dark:border-slate-800">
          <ul className="space-y-1">
            {sections.map((section) => {
              const isActive = section.id === active
              return (
                <li key={section.id}>
                  <button
                    type="button"
                    onClick={() => handleClick(section.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={`group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-all duration-150 ${focusRing} ${
                      isActive
                        ? 'bg-indigo-50 font-extrabold text-indigo-700 shadow-xs dark:bg-indigo-500/15 dark:text-indigo-300'
                        : 'font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200'
                    }`}
                  >
                    <span
                      className={`text-[10px] tabular-nums font-bold ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      {section.number}
                    </span>
                    <span className="truncate">{section.label}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </nav>
    </motion.aside>
  )
}
