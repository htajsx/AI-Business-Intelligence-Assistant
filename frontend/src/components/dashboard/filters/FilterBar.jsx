import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { ChevronDown, Check, Calendar } from 'lucide-react'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { serializeFilters } from '../../../utils/filterParams'
import { focusRing } from '../../../utils/ui'

const CATEGORY_OPTIONS = [
  'All Categories',
  'Health & Beauty',
  'Watches & Gifts',
  'Bed Bath Table',
  'Sports Leisure',
  'Computers & Accessories',
  'Furniture & Decor',
  'Housewares',
  'Cool Stuff',
  'Auto',
  'Toys',
  'Garden Tools'
]

const STATE_OPTIONS = ['All States', 'SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'DF']

const DEFAULT_FILTERS = {
  date: 'All time',
  cat: 'All Categories',
  state: 'All States',
  granularity: 'Month'
}

const MAX_CONTENT_WIDTH = 1280
const MORPH_EASE = [0.22, 1, 0.36, 1]
const SHADOW_REST = '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)'
const SHADOW_STUCK = '0 14px 32px -14px rgba(15, 23, 42, 0.34), 0 2px 8px -2px rgba(15, 23, 42, 0.14)'
const HAIRLINE_BACKGROUND = 'linear-gradient(90deg, transparent, rgba(89, 9, 7, 0.65), transparent)'

function getPagePadding() {
  const viewport = window.innerWidth
  if (viewport >= 1024) return 32
  if (viewport >= 640) return 24
  return 16
}

function DateDropdown({ label, open, onClick, onSelect, onClose }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 ${focusRing}`}
      >
        <Calendar size={13} className="text-slate-400 dark:text-slate-500 shrink-0" />
        <span className="truncate max-w-[150px] sm:max-w-none">{label}</span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform dark:text-slate-500 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-2"
          >
            <CustomDatePicker
              currentValue={label}
              onSelectPreset={(val) => {
                onSelect('date', val)
                if (onClose) onClose()
              }}
              onApplyRange={(rangeStr) => {
                onSelect('date', rangeStr)
                if (onClose) onClose()
              }}
              onClose={onClose}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function FilterDropdown({ id, label, open, onClick, options, onSelect }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 ${focusRing}`}
      >
        <span className="truncate max-w-[130px] sm:max-w-none">{label}</span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform dark:text-slate-500 shrink-0 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl thin-scroll dark:border-slate-800 dark:bg-slate-900"
          >
            {options.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onSelect(id, opt)}
                className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${focusRing}`}
              >
                <span className="truncate">{opt}</span>
                {label === opt && (
                  <Check
                    size={13}
                    className="text-indigo-600 dark:text-indigo-400 stroke-[2.5] shrink-0"
                  />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function FilterBar({
  onApply,
  onRefresh,
  isRefreshing = false,
  scrollRoot = null,
  children,
  activeFilters = DEFAULT_FILTERS
}) {
  const reduceMotion = useReducedMotion()
  const [openId, setOpenId] = useState(null)
  const [isDirty, setIsDirty] = useState(false)
  const [selections, setSelections] = useState(activeFilters)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [stuck, setStuck] = useState(false)
  const [gutter, setGutter] = useState(null)
  const [lockedHeight, setLockedHeight] = useState(0)

  const navigate = useNavigate()
  const barRef = useRef(null)
  const wrapperRef = useRef(null)
  const sentinelRef = useRef(null)

  const morph = useMemo(
    () => (reduceMotion ? { duration: 0 } : { duration: 0.42, ease: MORPH_EASE }),
    [reduceMotion]
  )

  const inlineChildrenMotion = useMemo(() => {
    if (reduceMotion) {
      return {
        initial: { opacity: 0 },
        animate: { opacity: 1, transition: { duration: 0 } },
        exit: { opacity: 0, transition: { duration: 0 } }
      }
    }
    return {
      initial: { opacity: 0, x: -8 },
      animate: { opacity: 1, x: 0, transition: { duration: 0.32, ease: MORPH_EASE, delay: 0.12 } },
      exit: { opacity: 0, x: -8, transition: { duration: 0.12, ease: 'easeOut' } }
    }
  }, [reduceMotion])

  const metaVariants = useMemo(() => {
    if (reduceMotion) {
      return {
        hidden: { height: 0, opacity: 0, transition: { duration: 0 } },
        visible: { height: 'auto', opacity: 1, transition: { duration: 0 } }
      }
    }
    return {
      hidden: {
        height: 0,
        opacity: 0,
        transition: {
          height: { duration: 0.42, ease: MORPH_EASE },
          opacity: { duration: 0.18, ease: 'easeOut' }
        }
      },
      visible: {
        height: 'auto',
        opacity: 1,
        transition: {
          height: { duration: 0.42, ease: MORPH_EASE },
          opacity: { duration: 0.3, delay: 0.14, ease: 'easeOut' }
        }
      }
    }
  }, [reduceMotion])

  const measureGutter = useCallback(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const width = wrapper.clientWidth
    const centeringOffset = (width - Math.min(width, MAX_CONTENT_WIDTH)) / 2
    setGutter(Math.max(0, Math.round(centeringOffset + getPagePadding())))
  }, [])

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
  }, [measureGutter])

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
      { root: scrollRoot, threshold: [0, 1] }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [scrollRoot])

  useEffect(() => {
    setOpenId(null)
    setShowExportMenu(false)
  }, [stuck])

  useEffect(() => {
    setSelections(activeFilters)
  }, [activeFilters])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (barRef.current && !barRef.current.contains(event.target)) {
        setOpenId(null)
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggle = (id) => {
    setShowExportMenu(false)
    setOpenId((prev) => (prev === id ? null : id))
  }

  const handleSelect = (id, value) => {
    setSelections((prev) => ({ ...prev, [id]: value }))
    setOpenId(null)
    setIsDirty(true)
  }

  const handleGranularity = (granularity) => {
    setSelections((prev) => ({ ...prev, granularity }))
    setIsDirty(true)
  }

  const handleApply = () => {
    setIsDirty(false)
    if (onApply) onApply(selections)
  }

  const handleReset = () => {
    setSelections(DEFAULT_FILTERS)
    setIsDirty(false)
    setOpenId(null)
    if (onApply) onApply(DEFAULT_FILTERS)
  }

  const handleExportCsv = () => {
    setShowExportMenu(false)
    const csvContent =
      'data:text/csv;charset=utf-8,KPI,Value,Change\nTotal Revenue,13221498,+8.2%\nTotal Orders,96478,-2.1%\nAverage Order Value,137.05,+1.4%\nOn-time Delivery,92.3%,+0.5%\nAvg Review Score,4.09,+0.1\n'
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `olist_dashboard_kpis_${selections.date.replace(/\s+/g, '_')}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleMetaSettled = (definition) => {
    if (definition === 'visible') setLockedHeight(0)
  }

  const surfaceClass = stuck
    ? 'border-x-transparent border-t-transparent border-b-slate-200/80 bg-white/80 dark:border-b-slate-800/80 dark:bg-slate-900/80'
    : 'border-slate-200/90 bg-white dark:border-slate-800/90 dark:bg-slate-900'

  const sideGutter = stuck ? 0 : gutter ?? 0
  const sidePadding = stuck ? 24 : 14
  const verticalPadding = stuck ? 10 : 14

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="pointer-events-none -mb-px h-px w-full" />
      <div
        ref={wrapperRef}
        className="pointer-events-none sticky top-0 z-30"
        style={{ minHeight: lockedHeight || undefined }}
      >
        {gutter !== null && (
          <motion.div
            ref={barRef}
            initial={false}
            animate={{
              marginLeft: sideGutter,
              marginRight: sideGutter,
              paddingLeft: sidePadding,
              paddingRight: sidePadding,
              paddingTop: verticalPadding,
              paddingBottom: verticalPadding,
              borderRadius: stuck ? 0 : 16,
              boxShadow: stuck ? SHADOW_STUCK : SHADOW_REST
            }}
            transition={morph}
            className={`pointer-events-auto relative border backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${surfaceClass}`}
          >
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ opacity: stuck ? 1 : 0, scaleX: stuck ? 1 : 0.4 }}
              transition={morph}
              className="pointer-events-none absolute inset-x-0 -bottom-px h-px"
              style={{ background: HAIRLINE_BACKGROUND }}
            />

            <div
              className={`flex ${stuck
                  ? 'flex-row items-center w-full'
                  : 'flex-col gap-3 lg:flex-row lg:items-center lg:justify-between w-full'
                }`}
            >
              <div className={`flex items-center gap-2 ${stuck ? 'shrink-0 flex-nowrap flex-1 pr-4' : 'flex-wrap'
                }`}>
                <DateDropdown
                  label={selections.date}
                  open={openId === 'date'}
                  onClick={() => toggle('date')}
                  onSelect={handleSelect}
                  onClose={() => setOpenId(null)}
                />
                <FilterDropdown
                  id="cat"
                  label={selections.cat}
                  open={openId === 'cat'}
                  onClick={() => toggle('cat')}
                  options={CATEGORY_OPTIONS}
                  onSelect={handleSelect}
                />
                <FilterDropdown
                  id="state"
                  label={selections.state}
                  open={openId === 'state'}
                  onClick={() => toggle('state')}
                  options={STATE_OPTIONS}
                  onSelect={handleSelect}
                />

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1 shrink-0" />

                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800/80 shrink-0">
                  <span className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Granularity
                  </span>
                  {['Week', 'Month', 'Quarter'].map((gran) => {
                    const active = selections.granularity === gran
                    return (
                      <button
                        key={gran}
                        type="button"
                        onClick={() => handleGranularity(gran)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${active
                            ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-900 dark:text-indigo-400'
                            : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                          } ${focusRing}`}
                      >
                        {gran}
                      </button>
                    )
                  })}
                </div>

                <AnimatePresence initial={false}>
                  {stuck && children && (
                    <motion.div
                      key="inline-children"
                      initial={inlineChildrenMotion.initial}
                      animate={inlineChildrenMotion.animate}
                      exit={inlineChildrenMotion.exit}
                      className="flex items-center gap-2 shrink-0 overflow-visible"
                    >
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block mx-1 shrink-0" />
                      <div className="shrink-0 flex items-center">{children}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className={`flex items-center gap-2 ${stuck ? 'shrink-0 flex-nowrap ml-auto' : 'flex-wrap'
                }`}>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={isRefreshing}
                  className={`flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 ${focusRing}`}
                  title="Refresh dashboard data"
                >
                  <span>{isRefreshing ? 'Refreshing…' : 'Refresh'}</span>
                </button>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      setOpenId(null)
                      setShowExportMenu(!showExportMenu)
                    }}
                    className={`flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-800 ${focusRing}`}
                  >
                    <span>Export</span>
                    <ChevronDown size={12} className="text-slate-400" />
                  </button>

                  <AnimatePresence>
                    {showExportMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                      >
                        <button
                          type="button"
                          onClick={handleExportCsv}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <span>Download CSV</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowExportMenu(false)
                            const p = serializeFilters({
                              period: activeFilters.date,
                              category: activeFilters.cat,
                              state: activeFilters.state,
                              granularity: activeFilters.granularity,
                            })
                            p.set('autoGenerate', '1')
                            navigate(`/report?${p.toString()}`)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <span>Generate Full Report</span>
                        </button>
                        {isDirty && (
                          <div className="border-t border-slate-100 pt-1 mt-1 dark:border-slate-800">
                            <p className="px-3 py-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                              Unapplied changes will be ignored
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setShowExportMenu(false)
                                onApply(selections)
                                const p = serializeFilters({
                                  period: selections.date,
                                  category: selections.cat,
                                  state: selections.state,
                                  granularity: selections.granularity,
                                })
                                p.set('autoGenerate', '1')
                                navigate(`/report?${p.toString()}`)
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-bold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
                            >
                              <span>Apply &amp; generate</span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {isDirty && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors ${focusRing}`}
                  >
                    <span>Reset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleApply}
                  className={`relative rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs transition-transform hover:bg-indigo-500 active:scale-95 ${focusRing} ${isDirty ? 'animate-pulse' : ''}`}
                >
                  {isDirty && (
                    <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 border border-white dark:border-slate-900" />
                    </span>
                  )}
                  Apply Filters
                </button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {!stuck && (
                <motion.div
                  key="meta-row"
                  variants={metaVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  onAnimationComplete={handleMetaSettled}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="pt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-[11px] text-slate-500 dark:border-slate-800/80 dark:text-slate-400">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          <span>Active Range: </span>
                          <span className="font-bold text-indigo-600 dark:text-indigo-400">
                            {activeFilters.date || activeFilters.period || 'All time'}
                          </span>
                        </span>
                        <span>·</span>
                        <span>
                          Category:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {activeFilters.cat || activeFilters.category || 'All Categories'}
                          </strong>
                        </span>
                        <span>·</span>
                        <span>
                          Region:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {activeFilters.state || 'All States'}
                          </strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence initial={false}>
              {!stuck && children && (
                <motion.div
                  key="bottom-children"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={morph}
                  style={{ overflow: 'hidden' }}
                >
                  <div className="border-t border-slate-100 pt-3 mt-3 dark:border-slate-800/80">
                    {children}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </>
  )
}