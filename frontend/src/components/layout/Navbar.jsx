import { AnimatePresence, motion } from 'framer-motion'
import { Moon, PanelRightClose, PanelRightOpen, Settings, Sun, RefreshCw } from 'lucide-react'
import { iconBtn } from '../../utils/ui'
import { useConnection } from '../../context/ConnectionContext'

function RailToggleButton({ railOpen, onToggle, onHoverStart, onHoverEnd }) {
  return (
    <button
      onClick={onToggle}
      onMouseEnter={onHoverStart}
      onMouseLeave={onHoverEnd}
      aria-label={railOpen ? 'Hide side panel' : 'Show side panel'}
      aria-pressed={railOpen}
      title={railOpen ? 'Close side panel' : 'Open side panel'}
      className={`${iconBtn} relative group`}
    >
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        {railOpen ? <PanelRightClose size={20} className="text-slate-800 dark:text-white" /> : <PanelRightOpen size={20} className="text-slate-800 dark:text-white" />}
      </motion.div>
    </button>
  )
}

export default function Navbar({ dark, onToggleTheme, railOpen, onToggleRail, onRailHoverStart, onRailHoverEnd }) {
  const { isConnected, isChecking, checkConnection } = useConnection()

  return (
    <header className="relative z-40 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white/95 px-5 backdrop-blur-2xl transition-colors duration-300 dark:border-[#2F2A24] dark:bg-[#14110D]/95 shadow-sm">
      <div className="flex items-center gap-3 shrink-0">
        <motion.div
          whileHover={{ scale: 1.05, rotate: 3 }}
          whileTap={{ scale: 0.95 }}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 shadow-md shadow-indigo-500/25 p-1"
        >
          <img
            src="/logo.png"
            alt="ATI Logo"
            className="h-full w-full object-contain filter drop-shadow"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <div className="absolute inset-0 rounded-xl border border-white/20 pointer-events-none" />
        </motion.div>

        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold tracking-tight text-slate-950 dark:text-white">
              AI <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent dark:from-indigo-400 dark:to-violet-400">Business Intelligence</span>
            </span>
            <span className="hidden sm:inline-flex items-center rounded-md bg-indigo-100 px-2 py-0.5 text-[11px] font-bold text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-500/30 uppercase tracking-wider">
              PRO
            </span>
          </div>
          <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-300">
            Enterprise Analytics &amp; Data Warehouse
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isConnected ? (
          <div className="mr-1 flex items-center gap-2.5 rounded-full border border-emerald-300 bg-emerald-50/90 px-3.5 py-1 text-xs font-bold text-emerald-900 shadow-xs dark:border-emerald-500/40 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="relative flex h-2.5 w-2.5">
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full bg-emerald-400"
                animate={{ scale: [1, 2.2], opacity: [0.7, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
              />
              <span className="relative h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800" />
            </span>
            <span>Live · Olist DW</span>
          </div>
        ) : (
          <button
            type="button"
            onClick={checkConnection}
            disabled={isChecking}
            title="Backend disconnected. Click to retry connection."
            className="mr-1 flex items-center gap-2 rounded-full border border-rose-300 bg-rose-50/90 px-3.5 py-1 text-xs font-bold text-rose-800 shadow-xs hover:bg-rose-100 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-300 transition-colors cursor-pointer"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="relative h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-800" />
            </span>
            <span>{isChecking ? 'Checking…' : 'Disconnected · No Connection'}</span>
            <RefreshCw size={12} className={isChecking ? 'animate-spin' : ''} />
          </button>
        )}

        <button
          onClick={onToggleTheme}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
          className={iconBtn}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={dark ? 'moon' : 'sun'}
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              className="block"
            >
              {dark ? (
                <Moon size={20} className="text-amber-300 fill-amber-300/20" />
              ) : (
                <Sun size={20} className="text-amber-600 fill-amber-500/20" />
              )}
            </motion.span>
          </AnimatePresence>
        </button>

        <button
          aria-label="System Settings"
          title="System Settings"
          className={iconBtn}
        >
          <motion.div whileHover={{ rotate: 45 }} transition={{ duration: 0.2 }}>
            <Settings size={20} className="text-slate-800 dark:text-white" />
          </motion.div>
        </button>

        <RailToggleButton
          railOpen={railOpen}
          onToggle={onToggleRail}
          onHoverStart={onRailHoverStart}
          onHoverEnd={onRailHoverEnd}
        />
      </div>
    </header>
  )
}