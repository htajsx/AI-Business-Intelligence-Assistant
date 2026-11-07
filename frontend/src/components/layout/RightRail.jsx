import { useState, useSyncExternalStore } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight, HelpCircle, MoreHorizontal } from 'lucide-react'
import { RAIL_SUGGESTIONS } from '../../config/constants'
import { useSchema } from '../../hooks/useSchema'
import Collapse from '../ui/Collapse'
import MiniChat from '../chat/mini/MiniChat'
import { divider, ghostBtn, MONO } from '../../utils/ui'

const listeners = new Set()
let snapshot = { chats: [], activeId: null }

function emit(next) {
  snapshot = next
  listeners.forEach((l) => l())
}

export const chatHistory = {
  subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  getSnapshot: () => snapshot,
  get: (id) => snapshot.chats.find((c) => c.id === id) || null,
  getActive: () => snapshot.chats.find((c) => c.id === snapshot.activeId) || null,
  upsert(id, messages) {
    if (!id || !messages?.length) return
    const firstUser = messages.find((m) => m.role === 'user')
    const title = (firstUser?.content || 'New chat').replace(/\s+/g, ' ').slice(0, 60)
    const exists = snapshot.chats.some((c) => c.id === id)
    const chats = exists
      ? snapshot.chats.map((c) => (c.id === id ? { ...c, title, messages } : c))
      : [{ id, title, createdAt: Date.now(), messages }, ...snapshot.chats]
    emit({ chats, activeId: id })
  },
  open(id) {
    if (snapshot.activeId === id || !snapshot.chats.some((c) => c.id === id)) return
    emit({ ...snapshot, activeId: id })
  },
  startNew() {
    if (snapshot.activeId === null) return
    emit({ ...snapshot, activeId: null })
  },
}

const timeLabel = (ts) =>
  new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

const lazyItem = { contentVisibility: 'auto', containIntrinsicSize: 'auto 48px' }

function SectionTitle({ children, action }) {
  return (
    <div className="mb-2.5 flex items-center justify-between px-1">
      <h2 className="text-[13px] font-extrabold uppercase tracking-wider text-slate-950 dark:text-white">
        {children}
      </h2>
      {action}
    </div>
  )
}

function Group({ title, count, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
      >
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.2 }} className="flex text-indigo-600 dark:text-indigo-400">
          <ChevronRight size={16} />
        </motion.span>
        <span>{title}</span>
        <span className="ml-auto rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold tabular-nums text-slate-800 dark:bg-white/10 dark:text-slate-200">
          {count}
        </span>
      </button>
      <Collapse open={open}>
        <ul className="pb-1 pt-1 space-y-1">{children}</ul>
      </Collapse>
    </div>
  )
}

function SchemaRow({ name, meta, description, mono, onClick }) {
  return (
    <li style={lazyItem}>
      <motion.button
        whileHover={{ x: 3 }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className="group flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-semibold text-slate-800 transition-all hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-indigo-300"
      >
        <span className="min-w-0 flex-1 truncate font-semibold" style={mono ? { fontFamily: MONO } : undefined}>
          {name}
        </span>
        {meta && (
          <span className="tabular-nums font-bold text-[11px] text-slate-700 dark:text-slate-300">
            {meta}
          </span>
        )}
        <span title={description} className="text-slate-500 transition-colors group-hover:text-indigo-600 dark:text-slate-400 dark:group-hover:text-indigo-300">
          <HelpCircle size={14} />
        </span>
      </motion.button>
    </li>
  )
}

export default function RightRail({ onPick, onNewChat }) {
  const navigate = useNavigate()
  const location = useLocation()
  const isChatPage = location.pathname === '/' || location.pathname === '/chat'

  const { chats, activeId } = useSyncExternalStore(
    chatHistory.subscribe,
    chatHistory.getSnapshot,
  )
  const { data: schemaData, isLoading: isSchemaLoading } = useSchema()

  if (!isChatPage) {
    return <MiniChat />
  }

  const tables = schemaData?.tables || []
  const kpis = schemaData?.kpis || []

  return (
    <div className="thin-scroll h-full w-[310px] shrink-0 overflow-y-auto border-l border-slate-200 bg-white/95 backdrop-blur-xl transition-colors duration-300 dark:border-[#2F2A24] dark:bg-[#14110D]/95">
      <section className="p-4">
        <SectionTitle
          action={
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                chatHistory.startNew()
                onNewChat?.()
              }}
              className="flex cursor-pointer items-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
            >
              New Chat
            </motion.button>
          }
        >
          Query History
        </SectionTitle>
        <ul className="space-y-1">
          {chats.length === 0 && (
            <li className="px-2 py-3 text-xs font-medium text-slate-600 dark:text-slate-400">
              No queries yet
            </li>
          )}
          {chats.map((chat) => {
            const active = chat.id === activeId
            return (
              <li key={chat.id} style={lazyItem} className="group relative">
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => {
                    chatHistory.open(chat.id)
                    navigate('/')
                  }}
                  aria-current={active ? 'true' : undefined}
                  className={`block w-full cursor-pointer rounded-xl border-l-3 py-2.5 pl-3.5 pr-10 text-left transition-all ${active
                      ? 'border-indigo-600 bg-indigo-50/80 shadow-xs dark:border-indigo-400 dark:bg-indigo-500/15'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-white/10'
                    }`}
                >
                  <p className={`truncate text-[13.5px] font-bold ${active ? 'text-indigo-900 dark:text-white' : 'text-slate-800 dark:text-slate-200'}`}>
                    {chat.title}
                  </p>
                  <p className="mt-0.5 text-[11.5px] font-medium text-slate-600 dark:text-slate-300">
                    {timeLabel(chat.createdAt)}
                  </p>
                </motion.button>
                <button
                  aria-label={`Options for ${chat.title}`}
                  className={`${ghostBtn} absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity`}
                >
                  <MoreHorizontal size={15} />
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className={`border-t p-4 ${divider}`}>
        <SectionTitle>Suggested Inquiries</SectionTitle>
        <ul className="space-y-2">
          {RAIL_SUGGESTIONS.map((q) => (
            <li key={q} style={lazyItem}>
              <motion.button
                onClick={() => onPick?.(q)}
                whileHover={{ x: 4, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="flex w-full cursor-pointer items-start rounded-xl border border-slate-200 bg-white p-2.5 text-left text-[12.5px] font-bold leading-snug text-slate-800 shadow-xs transition-all hover:border-indigo-400 hover:shadow-md hover:shadow-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-[#36302A] dark:bg-[#1B1814] dark:text-slate-200 dark:hover:border-indigo-500/60 dark:hover:shadow-[0_0_20px_-6px_rgba(89,9,7,0.3)]"
              >
                <span className="flex-1">{q}</span>
              </motion.button>
            </li>
          ))}
        </ul>
      </section>

      <section className={`border-t p-4 ${divider}`}>
        <SectionTitle>Data Schema &amp; KPIs</SectionTitle>
        {isSchemaLoading ? (
          <div className="py-4 text-center text-xs text-slate-400 animate-pulse">Loading schema...</div>
        ) : tables.length === 0 && kpis.length === 0 ? (
          <div className="py-4 text-center text-xs text-slate-400">No schema data available</div>
        ) : (
          <div className="space-y-1">
            {tables.length > 0 && (
              <Group title="Database Tables" count={tables.length}>
                {tables.map((t) => (
                  <SchemaRow
                    key={t.name}
                    name={t.name}
                    meta={t.rowCount}
                    description={t.description}
                    mono
                    onClick={() => onPick?.(t.question)}
                  />
                ))}
              </Group>
            )}
            {kpis.length > 0 && (
              <Group title="Governed KPIs" count={kpis.length}>
                {kpis.map((k, idx) => (
                  <SchemaRow
                    key={`${k.name || 'kpi'}-${idx}`}
                    name={k.name}
                    description={k.description}
                    onClick={() => onPick?.(k.question)}
                  />
                ))}
              </Group>
            )}
          </div>
        )}
      </section>
    </div>
  )
}