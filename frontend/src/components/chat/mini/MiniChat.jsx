import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Send, Sparkles, Plus, ArrowUpRight, ArrowDown, Filter } from 'lucide-react'
import { useChatContext } from '../../../context/ChatContext'
import { RAIL_SUGGESTIONS } from '../../../config/constants'
import AssistantMessage from '../messages/AssistantMessage'
import UserMessage from '../messages/UserMessage'
import TypingSteps from '../messages/TypingSteps'
import { divider, ghostBtn, focusRing } from '../../../utils/ui'

const CONTENT_ZOOM = 0.82

export default function MiniChat() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    messages,
    isLoading,
    sendMessage,
    resetChat,
    appliedFilters,
    useDashboardFilters,
    setUseDashboardFilters
  } = useChatContext()

  const [input, setInput] = useState('')
  const [showScrollBottom, setShowScrollBottom] = useState(false)
  const messagesEndRef = useRef(null)
  const scrollContainerRef = useRef(null)
  const textareaRef = useRef(null)

  const isScrolledNearBottom = () => {
    const el = scrollContainerRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    if (isScrolledNearBottom()) {
      scrollToBottom('smooth')
    }
  }, [messages, isLoading, scrollToBottom])

  const handleScroll = () => {
    const el = scrollContainerRef.current
    if (!el) return
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    setShowScrollBottom(!isBottom)
  }

  const handleTextareaChange = (e) => {
    const val = e.target.value.slice(0, 500)
    setInput(val)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 96)}px`
    }
  }

  const handleSend = () => {
    const trimmed = input.trim()
    if (!trimmed || isLoading) return

    let finalQ = trimmed
    if (useDashboardFilters) {
      const parts = []
      if (appliedFilters.date && appliedFilters.date !== 'All time') {
        parts.push(`period ${appliedFilters.date}`)
      }
      if (appliedFilters.cat && appliedFilters.cat !== 'All categories' && appliedFilters.cat !== 'All Categories') {
        parts.push(`category ${appliedFilters.cat}`)
      }
      if (appliedFilters.state && appliedFilters.state !== 'All states' && appliedFilters.state !== 'All States') {
        parts.push(`state ${appliedFilters.state}`)
      }

      if (parts.length > 0 && !finalQ.toLowerCase().includes('in state') && !finalQ.toLowerCase().includes('for period')) {
        const prefix = `[Filter: ${parts.join(', ')}] `
        finalQ = `${prefix}${finalQ}`.slice(0, 500)
      }
    }

    sendMessage(finalQ)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const filterSummary = [
    appliedFilters.date || 'All time',
    appliedFilters.cat || 'All categories',
    appliedFilters.state || 'All states'
  ].join(' · ')

  return (
    <div className="flex h-full w-full min-w-0 flex-col border-l border-slate-200 bg-white/95 backdrop-blur-xl dark:border-[#2F2A24] dark:bg-[#14110D]/95">
      <div className={`flex shrink-0 items-center justify-between border-b px-3 py-2 ${divider}`}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
            AI Assistant
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Start new chat"
            onClick={resetChat}
            className={`${ghostBtn} !flex !h-auto !w-auto flex-row items-center gap-1 whitespace-nowrap !px-2 !py-1 text-[10.5px] font-bold text-slate-700 dark:text-slate-300`}
          >
            <Plus size={12} className="shrink-0" />
            <span className="whitespace-nowrap">New</span>
          </button>
          <button
            type="button"
            title="Open full chat interface"
            onClick={() => navigate('/')}
            className="flex shrink-0 items-center gap-0.5 whitespace-nowrap rounded-lg bg-indigo-50 px-2 py-1 text-[10.5px] font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30"
          >
            <span>Full Chat</span>
            <ArrowUpRight size={12} />
          </button>
        </div>
      </div>

      <div className={`shrink-0 border-b bg-slate-50/70 px-3 py-1.5 dark:bg-[#1E1A16]/70 ${divider}`}>
        <div className="flex items-center justify-between gap-2">
          <label className="flex cursor-pointer select-none items-center gap-1.5 text-[10.5px] font-semibold text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={useDashboardFilters}
              onChange={(e) => setUseDashboardFilters(e.target.checked)}
              className="h-3 w-3 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-900"
            />
            <span>Use dashboard filters</span>
          </label>
          <Filter size={11} className="text-slate-400" />
        </div>
        {useDashboardFilters && (
          <div
            className="mt-1 truncate rounded-md bg-indigo-50 px-2 py-0.5 text-[9.5px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
            title={filterSummary}
          >
            {filterSummary}
          </div>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="thin-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden"
      >
        <div style={{ zoom: CONTENT_ZOOM }} className="space-y-3 p-3">
          {messages.length === 0 ? (
            <div className="space-y-3 pt-2">
              <div className="rounded-xl border border-dashed border-slate-200 p-3 text-center dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Ask questions about your {location.pathname.replace('/', '') || 'business'} data
                </p>
              </div>
              <div className="space-y-1.5">
                <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Suggested
                </p>
                {RAIL_SUGGESTIONS.slice(0, 4).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => sendMessage(q)}
                    className="block w-full rounded-lg border border-slate-200/80 bg-white p-2 text-left text-xs font-medium text-slate-700 shadow-xs transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-700 dark:border-slate-800 dark:bg-[#1B1814] dark:text-slate-300 dark:hover:border-indigo-500/50 dark:hover:text-indigo-300"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === 'user' ? (
                <UserMessage key={m.id} message={m} compact />
              ) : (
                <AssistantMessage
                  key={m.id}
                  message={m}
                  compact
                  onRetry={sendMessage}
                />
              )
            )
          )}

          {isLoading && <TypingSteps compact />}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {showScrollBottom && (
        <div className="relative">
          <button
            type="button"
            onClick={() => scrollToBottom('smooth')}
            className="absolute bottom-2 right-4 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg transition hover:scale-105 dark:bg-white dark:text-slate-900"
            aria-label="Scroll to bottom"
          >
            <ArrowDown size={12} />
          </button>
        </div>
      )}

      <div className={`shrink-0 border-t bg-white p-2.5 dark:bg-[#14110D] ${divider}`}>
        <div className="relative">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question... (Enter to send)"
            disabled={isLoading}
            className={`w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 pr-8 text-[11.5px] text-slate-900 placeholder-slate-400 focus:bg-white dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder-slate-500 dark:focus:bg-slate-900 ${focusRing}`}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1.5 cursor-pointer text-indigo-600 transition-colors disabled:text-slate-300 dark:text-indigo-400 dark:disabled:text-slate-600"
            aria-label="Send"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="mt-1 flex items-center justify-between px-1 text-[9.5px] text-slate-400">
          <span>Shift+Enter for new line</span>
          <span>{input.length}/500</span>
        </div>
      </div>
    </div>
  )
}