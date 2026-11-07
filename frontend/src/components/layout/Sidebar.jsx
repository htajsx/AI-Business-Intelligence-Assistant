import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { FileText, LayoutDashboard } from 'lucide-react'

// Icon Chat Bot (custom SVG, dùng currentColor để ăn theo màu active/hover)
function ChatBotIcon({ size = 24, className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M16,19a6.9908,6.9908,0,0,1-5.833-3.1287l1.666-1.1074a5.0007,5.0007,0,0,0,8.334,0l1.666,1.1074A6.9908,6.9908,0,0,1,16,19Z" />
      <path d="M20,8a2,2,0,1,0,2,2A1.9806,1.9806,0,0,0,20,8Z" />
      <path d="M12,8a2,2,0,1,0,2,2A1.9806,1.9806,0,0,0,12,8Z" />
      <path d="M17.7358,30,16,29l4-7h6a1.9966,1.9966,0,0,0,2-2V6a1.9966,1.9966,0,0,0-2-2H6A1.9966,1.9966,0,0,0,4,6V20a1.9966,1.9966,0,0,0,2,2h9v2H6a3.9993,3.9993,0,0,1-4-4V6A3.9988,3.9988,0,0,1,6,2H26a3.9988,3.9988,0,0,1,4,4V20a3.9993,3.9993,0,0,1-4,4H21.1646Z" />
    </svg>
  )
}

// Icon Database Search (lucide database-search)
function DatabaseSearchIcon({ size = 24, className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M21 11.693V5" />
      <path d="m22 22-1.875-1.875" />
      <path d="M3 12a9 3 0 0 0 8.697 2.998" />
      <path d="M3 5v14a9 3 0 0 0 9.28 2.999" />
      <circle cx="18" cy="18" r="3" />
      <ellipse cx="12" cy="5" rx="9" ry="3" />
    </svg>
  )
}

const NAV_ITEMS = [
  { label: 'Data Analytics & Query', icon: ChatBotIcon, route: '/' },
  { label: 'Executive Dashboard', icon: LayoutDashboard, route: '/dashboard' },
  { label: 'KPI & Insight Reports', icon: FileText, route: '/report' },
  { label: 'Data Warehouse Schema', icon: DatabaseSearchIcon, route: '/schema' },
]

export default function Sidebar() {
  const [expanded, setExpanded] = useState(false)
  const reduce = useReducedMotion()

  const location = useLocation()
  const navigate = useNavigate()

  const handleNavigate = (item) => {
    if (item.soon || !item.route) return
    navigate(item.route)
  }

  return (
    <motion.aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      animate={{ width: expanded ? 260 : 72 }}
      transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 32 }}
      className={`relative z-30 flex h-full shrink-0 flex-col overflow-hidden border-r border-slate-300 bg-[#A5A79B] backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-300 dark:border-[#2F2A24] dark:bg-[#14110D]/95 ${expanded ? 'shadow-2xl shadow-indigo-500/10 dark:shadow-black/70' : 'shadow-xs'
        }`}
    >
      <nav className="flex flex-col gap-2 p-3" aria-label="Main Navigation">
        {NAV_ITEMS.map((item) => {
          const { label, icon: Icon, soon, route: itemRoute } = item
          const active = !soon && itemRoute === location.pathname

          return (
            <motion.button
              key={label}
              disabled={soon}
              onClick={() => handleNavigate(item)}
              aria-current={active ? 'page' : undefined}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`group relative flex h-12 w-[236px] cursor-pointer items-center gap-3.5 rounded-xl px-3 text-[14px] font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed ${active
                ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/60 text-indigo-700 shadow-xs dark:from-indigo-600/20 dark:to-indigo-500/10 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30'
                : 'text-slate-800 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white'
                }`}
            >
              {active && (
                <motion.span
                  layoutId="sidebarActivePill"
                  className="absolute -left-3 top-2.5 h-7 w-1.5 rounded-r-full bg-indigo-600 dark:bg-indigo-400 shadow-sm"
                />
              )}

              <div className={`flex shrink-0 p-1.5 rounded-lg transition-transform group-hover:scale-110 ${active ? 'bg-indigo-600 text-white dark:bg-indigo-500' : 'bg-slate-100 text-slate-800 dark:bg-[#26211C] dark:text-slate-200 group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:group-hover:bg-indigo-500/20 dark:group-hover:text-indigo-300'
                }`}>
                <Icon size={20} />
              </div>

              <span
                className={`flex-1 whitespace-nowrap text-left font-bold transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'
                  }`}
              >
                {label}
              </span>

              {soon && (
                <span
                  className={`rounded-md bg-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-white/10 dark:text-slate-300 transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0'
                    }`}
                >
                  Soon
                </span>
              )}
            </motion.button>
          )
        })}
      </nav>

      <div
        className={`mt-auto w-[260px] p-3 transition-opacity duration-200 ${expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        aria-hidden={!expanded}
      >
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-indigo-50/30 p-3 text-xs text-slate-800 dark:border-[#2F2A24] dark:bg-gradient-to-br dark:from-[#1B1814] dark:to-[#26211C] dark:text-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <p className="font-extrabold text-slate-950 dark:text-white text-[13px]">
              Olist E-Commerce
            </p>
          </div>
          <p className="mt-1 font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
            100k Orders · 2016 – 2018 Period
          </p>
        </div>
      </div>
    </motion.aside>
  )
}