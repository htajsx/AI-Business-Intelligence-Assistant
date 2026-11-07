import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Check, AlertCircle, ArrowRight } from 'lucide-react'
import { focusRing } from '../../utils/ui'

const DATA_MIN_DATE = '2016-09-04'
const DATA_MAX_DATE = '2018-10-17'

const DATE_PRESETS = [
  { id: 'All time', label: 'All time', desc: 'Full dataset (2016 – 2018)' },
  { id: '2018-08-01 – 2018-08-31', label: 'Aug 2018 (latest full month)', desc: 'August 2018' },
  { id: '2018-04-01 – 2018-06-30', label: 'Q2 2018', desc: 'Apr – Jun 2018' },
  { id: '2017-09-01 – 2018-08-31', label: 'Last 12 months (to Aug 2018)', desc: 'Sep 2017 – Aug 2018' },
  { id: 'Year 2018', label: 'Year 2018', desc: 'Jan – Oct 2018' },
  { id: 'Year 2017', label: 'Year 2017', desc: 'Full year 2017' },
  { id: 'Year 2016', label: 'Year 2016', desc: 'Sep – Dec 2016' },
  { id: 'Q4 2017', label: 'Q4 2017', desc: 'Oct – Dec 2017' },
  { id: 'Q3 2017', label: 'Q3 2017', desc: 'Jul – Sep 2017' },
  { id: 'Q2 2017', label: 'Q2 2017', desc: 'Apr – Jun 2017' },
  { id: 'Q1 2017', label: 'Q1 2017', desc: 'Jan – Mar 2017' }
]

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month, 1).getDay()
}

function formatDateString(year, month, day) {
  const m = String(month + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

function isDateOutOfRange(dateStr) {
  return dateStr < DATA_MIN_DATE || dateStr > DATA_MAX_DATE
}

export default function CustomDatePicker({
  currentValue = 'All time',
  onSelectPreset,
  onApplyRange
}) {
  const customRangeMatch = useMemo(() => {
    if (!currentValue) return null
    const match = String(currentValue).match(/(\d{4}-\d{2}-\d{2})\s*(?:–|-|to)\s*(\d{4}-\d{2}-\d{2})/)
    if (match) {
      return { start: match[1], end: match[2] }
    }
    return null
  }, [currentValue])

  const [activeTab, setActiveTab] = useState(() => (customRangeMatch ? 'custom' : 'preset')) // 'preset' | 'custom'
  const [customStart, setCustomStart] = useState(() => customRangeMatch?.start || '2017-01-01')
  const [customEnd, setCustomEnd] = useState(() => customRangeMatch?.end || '2017-12-31')
  const [selectingField, setSelectingField] = useState('start') // 'start' | 'end'
  const [errorMessage, setErrorMessage] = useState('')

  // Calendar view state
  const currentDate = selectingField === 'start' ? customStart : customEnd
  const parsedDate = useMemo(() => {
    const parts = (currentDate || '2017-01-01').split('-').map(Number)
    return {
      year: parts[0] || 2017,
      month: (parts[1] || 1) - 1,
      day: parts[2] || 1
    }
  }, [currentDate])

  const [viewYear, setViewYear] = useState(() => parsedDate.year)
  const [viewMonth, setViewMonth] = useState(() => parsedDate.month)

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      if (viewYear > 2016) {
        setViewYear((y) => y - 1)
        setViewMonth(11)
      }
    } else {
      setViewMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      if (viewYear < 2018) {
        setViewYear((y) => y + 1)
        setViewMonth(0)
      }
    } else {
      setViewMonth((m) => m + 1)
    }
  }

  const handleSelectDay = (day) => {
    const dateStr = formatDateString(viewYear, viewMonth, day)
    setErrorMessage('')

    if (selectingField === 'start') {
      setCustomStart(dateStr)
      if (dateStr > customEnd) {
        setCustomEnd(dateStr)
      }
      setSelectingField('end')
    } else {
      if (dateStr < customStart) {
        setErrorMessage('End date cannot be earlier than start date.')
        return
      }
      setCustomEnd(dateStr)
    }
  }

  const handleApply = (e) => {
    e.stopPropagation()
    setErrorMessage('')

    if (!customStart || !customEnd) {
      setErrorMessage('Please select both start and end dates.')
      return
    }

    if (customStart > customEnd) {
      setErrorMessage('Start date cannot be after end date.')
      return
    }

    // Kiểm tra phạm vi dữ liệu Olist DW
    if (customStart < DATA_MIN_DATE && customEnd < DATA_MIN_DATE) {
      setErrorMessage('No data available. Dataset starts from September 2016.')
      return
    }

    if (customStart > DATA_MAX_DATE && customEnd > DATA_MAX_DATE) {
      setErrorMessage('No data available. Dataset ends in October 2018.')
      return
    }

    onApplyRange(`${customStart} – ${customEnd}`)
  }

  // Generate calendar days
  const totalDays = getDaysInMonth(viewYear, viewMonth)
  const startDayOfWeek = getFirstDayOfWeek(viewYear, viewMonth)

  const daysArray = []
  for (let i = 0; i < startDayOfWeek; i++) {
    daysArray.push(null)
  }
  for (let day = 1; day <= totalDays; day++) {
    daysArray.push(day)
  }

  return (
    <div className="w-[360px] sm:w-[420px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      {/* Header Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => { setActiveTab('preset'); setErrorMessage('') }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'preset'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Presets
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('custom'); setErrorMessage('') }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'custom'
                ? 'bg-white text-indigo-700 shadow-xs dark:bg-slate-900 dark:text-indigo-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Custom Calendar
          </button>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          DW: 2016 – 2018
        </span>
      </div>

      {/* TAB 1: QUICK PRESETS */}
      {activeTab === 'preset' && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            Select a predefined period
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DATE_PRESETS.map((preset) => {
              const isSelected =
                currentValue === preset.id ||
                currentValue === preset.label ||
                (preset.id === 'All time' && currentValue === '2016 – 2018 Full Period')
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onSelectPreset(preset.id)}
                  className={`flex flex-col text-left rounded-xl border p-2.5 transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/80 text-indigo-900 shadow-xs dark:border-indigo-500/50 dark:bg-indigo-950/40 dark:text-indigo-200'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800/60'
                  } ${focusRing}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{preset.label}</span>
                    {isSelected && <Check size={13} className="text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <span className="mt-0.5 text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {preset.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOM CALENDAR */}
      {activeTab === 'custom' && (
        <div className="mt-3 space-y-3">
          {/* Start and End Date Inputs with modern styling */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectingField('start')
                const parts = customStart.split('-').map(Number)
                setViewYear(parts[0] || 2017)
                setViewMonth((parts[1] || 1) - 1)
              }}
              className={`flex flex-col text-left rounded-xl border p-2.5 transition-all ${
                selectingField === 'start'
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Start Date
              </span>
              <span className="mt-0.5 text-xs font-black tabular-nums text-slate-900 dark:text-slate-50">
                {customStart}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectingField('end')
                const parts = customEnd.split('-').map(Number)
                setViewYear(parts[0] || 2017)
                setViewMonth((parts[1] || 1) - 1)
              }}
              className={`flex flex-col text-left rounded-xl border p-2.5 transition-all ${
                selectingField === 'end'
                  ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20'
                  : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-950/60'
              }`}
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                End Date
              </span>
              <span className="mt-0.5 text-xs font-black tabular-nums text-slate-900 dark:text-slate-50">
                {customEnd}
              </span>
            </button>
          </div>

          {/* Calendar Picker UI */}
          <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-950/60">
            {/* Month & Year Navigation */}
            <div className="flex items-center justify-between pb-2">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={viewYear <= 2016 && viewMonth <= 8}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-slate-50">
                  {MONTH_NAMES[viewMonth]} {viewYear}
                </span>
              </div>

              <button
                type="button"
                onClick={handleNextMonth}
                disabled={viewYear >= 2018 && viewMonth >= 9}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-200/70 disabled:opacity-30 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 pb-1">
              {DAYS_OF_WEEK.map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {daysArray.map((day, idx) => {
                if (!day) {
                  return <div key={`empty-${idx}`} className="h-7 w-7" />
                }

                const dateStr = formatDateString(viewYear, viewMonth, day)
                const isOutOfData = isDateOutOfRange(dateStr)
                const isStart = dateStr === customStart
                const isEnd = dateStr === customEnd
                const isInRange = dateStr >= customStart && dateStr <= customEnd

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={isOutOfData}
                    onClick={() => handleSelectDay(day)}
                    className={`h-7 w-7 rounded-lg text-xs font-bold tabular-nums transition-all ${
                      isStart || isEnd
                        ? 'bg-indigo-600 text-white shadow-xs font-black'
                        : isInRange
                          ? 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950/60 dark:text-indigo-200'
                          : isOutOfData
                            ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                            : 'text-slate-700 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Error Message Alert */}
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-bold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <button
            type="button"
            onClick={handleApply}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-black text-white shadow-md hover:bg-indigo-500 active:scale-[0.98] transition-all"
          >
            <span>Apply Custom Date Range</span>
            <ArrowRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

