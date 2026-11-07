import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Check,
  ChevronDown,
  X,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react'
import CustomDatePicker from '../../ui/CustomDatePicker'
import { focusRing } from '../../../utils/ui'
import { useConnection } from '../../../context/ConnectionContext'
import { useStickyBar } from '../../../hooks/useStickyBar'
import {
  DEFAULT_FILTERS,
  VALID_CATEGORIES,
  VALID_STATES,
  PERIOD_LABELS,
  areFiltersEqual,
} from '../../../utils/filterParams'
import {
  CONTENT_MAX_WIDTH,
  PAGE_PADDING,
  REPORT_SECTION_ORDER,
  SECTION_LABELS,
} from '../lib/reportLayout'

const MORPH_EASE = [0.22, 1, 0.36, 1]
const SHADOW_REST =
  '0 1px 3px 0 rgba(15, 23, 42, 0.08), 0 1px 2px -1px rgba(15, 23, 42, 0.08)'
const SHADOW_STUCK =
  '0 14px 32px -14px rgba(15, 23, 42, 0.34), 0 2px 8px -2px rgba(15, 23, 42, 0.14)'

const SMOOTH =
  'transition-[padding,gap,font-size,line-height,border-radius,background-color,border-color,color,box-shadow,opacity] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)]'

function triggerClass(compact) {
  return [
    'flex items-center rounded-xl border font-bold shadow-xs hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50',
    SMOOTH,
    compact
      ? 'gap-1.5 border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-700 hover:bg-white dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-slate-900'
      : 'gap-2 border-slate-300 bg-white px-3.5 py-2 text-[13px] text-slate-900 hover:bg-slate-50 dark:border-[#36302A] dark:bg-[#211D18] dark:text-slate-100 dark:hover:bg-white/10',
    focusRing,
  ].join(' ')
}

function iconClass(compact) {
  return `shrink-0 transition-[width,height] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'
    }`
}

function chevronClass(compact, open) {
  return `shrink-0 text-slate-400 dark:text-slate-500 transition-[width,height,transform] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${compact ? 'h-3 w-3' : 'h-3.5 w-3.5'
    } ${open ? 'rotate-180' : ''}`
}

function DateDropdown({
  label,
  selected,
  open,
  compact,
  onToggle,
  onSelect,
  onClose,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle('period')}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={triggerClass(compact)}
      >
        <Calendar
          className={`${iconClass(compact)} text-slate-400 dark:text-slate-500`}
          aria-hidden="true"
        />
        <span className="max-w-[130px] truncate sm:max-w-none">{label}</span>
        <ChevronDown className={chevronClass(compact, open)} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 top-full z-50 mt-1.5"
          >
            <CustomDatePicker
              currentValue={selected}
              onSelectPreset={(val) => {
                onSelect('period', val)
                if (onClose) onClose()
              }}
              onApplyRange={(rangeStr) => {
                onSelect('period', rangeStr)
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

function Dropdown({
  id,
  label,
  open,
  compact,
  options,
  selected,
  onToggle,
  onSelect,
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={triggerClass(compact)}
      >
        <span className="max-w-[120px] truncate sm:max-w-none">{label}</span>
        <ChevronDown className={chevronClass(compact, open)} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="thin-scroll absolute left-0 top-full z-50 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div role="listbox">
              {options.map((opt) => {
                const isSelected = opt === selected
                return (
                  <button
                    key={opt}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => onSelect(id, opt)}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${focusRing} ${isSelected ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''
                      }`}
                  >
                    <span className="truncate">{opt}</span>
                    {isSelected && (
                      <Check
                        size={13}
                        className="shrink-0 stroke-[2.5] text-indigo-600 dark:text-indigo-400"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionsDropdown({ open, onToggle, onSelectSection }) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle('sections')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClass(true)}
      >
        <Layers className={`${iconClass(true)} text-slate-400 dark:text-slate-500`} aria-hidden="true" />
        <span>Sections</span>
        <ChevronDown className={chevronClass(true, open)} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="thin-scroll absolute left-0 top-full z-50 mt-1.5 max-h-72 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            {REPORT_SECTION_ORDER.map((id, index) => (
              <button
                key={id}
                type="button"
                onClick={() => onSelectSection(id)}
                className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${focusRing}`}
              >
                <span className="text-[10px] font-bold tabular-nums text-slate-400">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="truncate">{SECTION_LABELS[id]}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ExportMenu({ open, compact, onToggle, disabled, busy, onExport }) {
  const items = [
    { mode: 'print', title: 'Print / Save as PDF', hint: 'Uses standard system print dialog' },
    { mode: 'download', title: 'Download PDF Document', hint: 'Exports high-resolution PDF instantly' },
  ]

  return (
    <div className="relative">
      <motion.button
        type="button"
        whileTap={disabled || busy ? undefined : { scale: 0.97 }}
        onClick={() => onToggle('export')}
        disabled={disabled || busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClass(compact)}
      >
        <span>{busy ? 'Exporting…' : 'Export PDF'}</span>
        <ChevronDown className={chevronClass(compact, open)} aria-hidden="true" />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            <div role="menu">
              {items.map(({ mode, title, hint }) => (
                <button
                  key={mode}
                  type="button"
                  role="menuitem"
                  onClick={() => onExport(mode)}
                  className={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-slate-800 ${focusRing}`}
                >
                  <span>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                      {title}
                    </span>
                    <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {hint}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ReportToolbar({
  filters,
  activeReportFilters,
  onChange,
  onGenerate,
  onReset,
  onExport,
  isGenerating,
  isExporting = false,
  hasReport,
  scrollRoot = null,
}) {
  const { isConnected } = useConnection()
  const reduceMotion = useReducedMotion()
  const [openId, setOpenId] = useState(null)

  const barRef = useRef(null)
  const wrapperRef = useRef(null)
  const sentinelRef = useRef(null)

  const { stuck, gutter, lockedHeight, scrollProgress } = useStickyBar({
    scrollRoot,
    barRef,
    wrapperRef,
    sentinelRef,
    contentMaxWidth: CONTENT_MAX_WIDTH,
    pagePadding: PAGE_PADDING,
  })

  const [prevStuck, setPrevStuck] = useState(stuck)
  if (prevStuck !== stuck) {
    setPrevStuck(stuck)
    setOpenId(null)
  }

  const morph = useMemo(
    () => (reduceMotion ? { duration: 0 } : { duration: 0.42, ease: MORPH_EASE }),
    [reduceMotion],
  )

  const popIn = useMemo(
    () =>
      reduceMotion
        ? { opacity: 0 }
        : { opacity: 0, x: -10, scale: 0.96 },
    [reduceMotion],
  )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (barRef.current && !barRef.current.contains(event.target)) {
        setOpenId(null)
      }
    }
    const handleKey = (event) => {
      if (event.key === 'Escape') setOpenId(null)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKey)
    }
  }, [])

  const toggle = (id) => setOpenId((prev) => (prev === id ? null : id))

  const handleSelect = (id, value) => {
    onChange(id, value)
    setOpenId(null)
  }

  const handleExport = (mode) => {
    setOpenId(null)
    onExport(mode)
  }

  const handleReset = () => {
    setOpenId(null)
    if (onReset) onReset()
  }

  const handleSelectSection = (id) => {
    setOpenId(null)
    const el = document.getElementById(id)
    el?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' })
  }

  const isDirty = activeReportFilters ? !areFiltersEqual(filters, activeReportFilters) : false

  const chips = []
  if (filters.category !== DEFAULT_FILTERS.category) {
    chips.push({ key: 'category', label: `Category: ${filters.category}` })
  }
  if (filters.state !== DEFAULT_FILTERS.state) {
    chips.push({ key: 'state', label: `State: ${filters.state}` })
  }

  const generateLabel = isGenerating
    ? 'Generating…'
    : hasReport
      ? isDirty
        ? 'Regenerate Report *'
        : 'Regenerate Report'
      : 'Generate KPI Report'

  const surfaceClass = stuck
    ? 'border-x-transparent border-t-transparent border-b-slate-200/80 bg-white/80 dark:border-b-slate-800/80 dark:bg-slate-900/80'
    : 'border-slate-200/90 bg-white/95 dark:border-[#2F2A24] dark:bg-[#1B1814]/95'

  const sideGutter = stuck ? 0 : gutter ?? 0
  const sidePadding = stuck ? 24 : 14
  const verticalPadding = stuck ? 8 : 14

  return (
    <>
      <div
        ref={sentinelRef}
        aria-hidden="true"
        className="pointer-events-none -mb-px h-px w-full"
      />
      <div
        ref={wrapperRef}
        data-no-print
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
              boxShadow: stuck ? SHADOW_STUCK : SHADOW_REST,
            }}
            transition={morph}
            className={`pointer-events-auto relative border backdrop-blur-xl backdrop-saturate-150 transition-[background-color,border-color] duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${surfaceClass}`}
          >
            <motion.span
              aria-hidden="true"
              initial={false}
              animate={{ opacity: stuck ? 1 : 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.3 }}
              style={{ scaleX: scrollProgress }}
              className="pointer-events-none absolute inset-x-0 -bottom-px h-[2px] origin-left bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600"
            />

            <div className="flex min-h-[34px] items-center justify-between gap-3">
              <div
                className={`flex min-w-0 flex-1 items-center gap-2 ${stuck ? 'flex-nowrap' : 'flex-wrap'
                  }`}
              >
                <DateDropdown
                  label={PERIOD_LABELS[filters.period] ?? filters.period}
                  selected={filters.period}
                  open={openId === 'period'}
                  compact={stuck}
                  onToggle={toggle}
                  onSelect={handleSelect}
                  onClose={() => setOpenId(null)}
                />

                <Dropdown
                  id="category"
                  label={filters.category}
                  open={openId === 'category'}
                  compact={stuck}
                  options={VALID_CATEGORIES}
                  selected={filters.category}
                  onToggle={toggle}
                  onSelect={handleSelect}
                />

                <Dropdown
                  id="state"
                  label={filters.state}
                  open={openId === 'state'}
                  compact={stuck}
                  options={VALID_STATES}
                  selected={filters.state}
                  onToggle={toggle}
                  onSelect={handleSelect}
                />

                <AnimatePresence initial={false}>
                  {stuck && (
                    <motion.div
                      key="sections-dropdown"
                      initial={popIn}
                      animate={{
                        opacity: 1,
                        x: 0,
                        scale: 1,
                        transition: { ...morph, delay: reduceMotion ? 0 : 0.14 },
                      }}
                      exit={{ ...popIn, transition: { duration: reduceMotion ? 0 : 0.15 } }}
                      className="shrink-0 xl:hidden"
                    >
                      <SectionsDropdown
                        open={openId === 'sections'}
                        onToggle={toggle}
                        onSelectSection={handleSelectSection}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 ${focusRing}`}
                >
                  <span>Reset</span>
                </button>

                <ExportMenu
                  open={openId === 'export'}
                  compact={stuck}
                  onToggle={toggle}
                  disabled={!hasReport}
                  busy={isExporting}
                  onExport={handleExport}
                />

                <motion.button
                  type="button"
                  whileHover={isGenerating ? undefined : { scale: 1.03 }}
                  whileTap={isGenerating ? undefined : { scale: 0.97 }}
                  onClick={onGenerate}
                  disabled={isGenerating}
                  className={`flex items-center gap-1.5 rounded-xl bg-indigo-600 font-extrabold text-white shadow-md shadow-indigo-500/20 hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70 ${SMOOTH} ${stuck ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]'
                    } ${focusRing}`}
                >
                  <Sparkles className={iconClass(stuck)} aria-hidden="true" />
                  <span>{generateLabel}</span>
                </motion.button>
              </div>
            </div>

            <AnimatePresence initial={false}>
              {!stuck && (
                <motion.div
                  key="scope-row"
                  initial={reduceMotion ? { opacity: 0 } : { height: 0, opacity: 0 }}
                  animate={
                    reduceMotion
                      ? { opacity: 1 }
                      : {
                        height: 'auto',
                        opacity: 1,
                        transition: {
                          height: { duration: 0.42, ease: MORPH_EASE },
                          opacity: { duration: 0.3, delay: 0.14, ease: 'easeOut' },
                        },
                      }
                  }
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : {
                        height: 0,
                        opacity: 0,
                        transition: {
                          height: { duration: 0.42, ease: MORPH_EASE },
                          opacity: { duration: 0.16, ease: 'easeOut' },
                        },
                      }
                  }
                  className="overflow-hidden"
                >
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5 dark:border-[#2F2A24]">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        Active scope:
                      </span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {filters.period} · {filters.category} · {filters.state}
                      </span>

                      {chips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pl-1">
                          {chips.map((chip) => (
                            <button
                              key={chip.key}
                              type="button"
                              onClick={() => onChange(chip.key, DEFAULT_FILTERS[chip.key])}
                              aria-label={`Remove filter ${chip.label}`}
                              className={`inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 ${focusRing}`}
                            >
                              {chip.label}
                              <X size={11} aria-hidden="true" />
                            </button>
                          ))}
                        </div>
                      )}

                      {isDirty && (
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                          * Filters changed since last report
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      <span
                        className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                          }`}
                      />
                      <span>{isConnected ? 'Live DW Synced' : 'Offline / Standby'}</span>
                    </div>
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