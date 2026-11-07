import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { focusRing } from '../../utils/ui'

export default function SchemaTabs({ activeTab, onTabChange, query, onQueryChange }) {
  const TABS = [
    { id: 'tables', label: 'Data Tables' },
    { id: 'kpis', label: 'Governed KPIs' }
  ]

  return (
    <div className="mb-6 flex flex-col-reverse justify-between gap-4 border-b-2 border-slate-200 sm:flex-row sm:items-center dark:border-[#36302A]">
      <div role="tablist" className="flex gap-8">
        {TABS.map((tab) => {
          const active = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`relative pb-3 text-base font-extrabold transition-colors ${
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-white'
              } ${focusRing}`}
            >
              {tab.label}
              {active && (
                <motion.div
                  layoutId="schemaTabUnderline"
                  className="absolute bottom-[-2px] left-0 right-0 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="relative mb-2 sm:mb-0">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-600 dark:text-indigo-400" />
        <input
          type="search"
          aria-label="Search schema catalog"
          placeholder={`Search within ${activeTab === 'tables' ? 'data tables' : 'KPI metrics'}...`}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onQueryChange('')
          }}
          className={`w-full rounded-xl border border-slate-300 bg-white py-2 pl-10 pr-3.5 text-[13.5px] font-bold text-slate-900 placeholder:text-slate-500 shadow-xs sm:w-72 dark:border-[#36302A] dark:bg-[#211D18] dark:text-white dark:placeholder:text-slate-400 ${focusRing}`}
        />
      </div>
    </div>
  )
}