import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'framer-motion'
import Navbar from './Navbar'
import Sidebar from './Sidebar'
import { SANS } from '../../utils/ui'
import { useChatContext } from '../../context/ChatContext'

const RAIL_WIDTH_CHAT = 310
const RAIL_WIDTH_MINI = 400

export default function AppLayout({ children, rail }) {
  const reduce = useReducedMotion()
  const { railOpen, setRailOpen } = useChatContext()
  const location = useLocation()
  const isChatPage = location.pathname === '/' || location.pathname === '/chat'
  const railWidth = isChatPage ? RAIL_WIDTH_CHAT : RAIL_WIDTH_MINI

  const [dark, setDark] = useState(() => {
    try {
      const saved = localStorage.getItem('bi-theme')
      if (saved) return saved === 'dark'
    } catch {
      void 0
    }
    return true
  })

  const [railHovered, setRailHovered] = useState(false)
  const hoverTimeout = useRef(null)

  const showOverlay = !railOpen && railHovered && Boolean(rail)

  const handleToggleRail = () => {
    setRailOpen((v) => !v)
    setRailHovered(false)
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
  }

  const handleRailHoverStart = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    setRailHovered(true)
  }, [])

  const handleRailHoverEnd = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current)
    hoverTimeout.current = setTimeout(() => {
      setRailHovered(false)
    }, 300)
  }, [])

  useEffect(() => () => clearTimeout(hoverTimeout.current), [])

  useEffect(() => {
    try {
      localStorage.setItem('bi-theme', dark ? 'dark' : 'light')
    } catch {
      void 0
    }

    document.documentElement.style.colorScheme = dark ? 'dark' : 'light'

    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [dark])

  useEffect(() => {
    const restoreTheme = () => {
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
      document.documentElement.classList.toggle('dark', dark)
    }
    const forceLight = () => {
      document.documentElement.style.colorScheme = 'light'
      document.documentElement.classList.remove('dark')
    }

    window.addEventListener('beforeprint', forceLight)
    window.addEventListener('afterprint', restoreTheme)
    return () => {
      window.removeEventListener('beforeprint', forceLight)
      window.removeEventListener('afterprint', restoreTheme)
    }
  }, [dark])

  const focusInput = () => document.querySelector('[data-chat-input]')?.focus()

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        focusInput()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const slide = reduce ? { duration: 0.15 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }

  return (
    <MotionConfig reducedMotion="user">
      <div
        style={{ fontFamily: SANS }}
        className="relative flex h-dvh flex-col overflow-hidden bg-slate-50 text-[15px] font-medium text-slate-900 antialiased transition-colors duration-200 selection:bg-indigo-500 selection:text-white dark:bg-slate-950 dark:text-slate-50"
      >

        <Navbar
          dark={dark}
          onToggleTheme={() => setDark((v) => !v)}
          railOpen={railOpen}
          onToggleRail={handleToggleRail}
          onRailHoverStart={handleRailHoverStart}
          onRailHoverEnd={handleRailHoverEnd}
        />

        <div className="relative z-10 flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <main className="relative min-w-0 flex-1 overflow-hidden">{children}</main>

          {rail && (
            <motion.div
              data-no-print
              initial={false}
              animate={{ width: railOpen ? railWidth : 0 }}
              transition={slide}
              className="relative shrink-0 overflow-hidden"
              aria-hidden={!railOpen}
              inert={!railOpen ? '' : undefined}
            >
              <div
                style={{ width: railWidth }}
                className="h-full border-l border-slate-200 bg-white/95 backdrop-blur-xl dark:border-[#2F2A24] dark:bg-[#14110D]/95"
              >
                {rail}
              </div>
            </motion.div>
          )}

          <AnimatePresence initial={false}>
            {showOverlay && (
              <motion.aside
                data-no-print
                key="rail-overlay"
                initial={{ x: railWidth, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: railWidth, opacity: 0 }}
                transition={slide}
                onMouseEnter={handleRailHoverStart}
                onMouseLeave={handleRailHoverEnd}
                style={{ width: railWidth }}
                className="absolute inset-y-0 right-0 z-30 flex overflow-hidden border-l border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-[#2F2A24] dark:bg-[#14110D]/95"
              >
                {rail}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  )
}