import { createContext, useContext, useState, useRef, useEffect, useCallback, useSyncExternalStore } from 'react'
import { askQuestion } from '../api/chatApi'
import { chatHistory } from '../components/layout/RightRail'

const ChatContext = createContext(null)

let counter = 0
const nextId = () => `msg-${++counter}`

export function ChatProvider({ children }) {
  const restored = useRef(chatHistory.getActive()).current
  const [messages, setMessages] = useState(restored ? restored.messages : [])
  const [isLoading, setIsLoading] = useState(false)
  const conversationId = useRef(restored ? restored.id : crypto.randomUUID())
  const epoch = useRef(0)

  const [railOpen, setRailOpen] = useState(() => {
    try {
      const saved = localStorage.getItem('bi-rail-open')
      if (saved !== null) return saved === 'true'
    } catch (_e) {
      void 0
    }
    return typeof window !== 'undefined' ? window.innerWidth >= 1200 : true
  })

  useEffect(() => {
    try {
      localStorage.setItem('bi-rail-open', railOpen ? 'true' : 'false')
    } catch (_e) {
      void 0
    }
  }, [railOpen])

  const [appliedFilters, setAppliedFilters] = useState({
    date: 'All time',
    cat: 'All Categories',
    state: 'All States',
    granularity: 'Month'
  })

  const [useDashboardFilters, setUseDashboardFilters] = useState(false)

  const activeId = useSyncExternalStore(
    chatHistory.subscribe,
    () => chatHistory.getSnapshot().activeId
  )
  const lastActive = useRef(activeId)

  useEffect(() => {
    if (lastActive.current === activeId) return
    lastActive.current = activeId
    if (activeId === conversationId.current) return

    epoch.current += 1
    setIsLoading(false)

    const target = activeId ? chatHistory.get(activeId) : null
    if (target) {
      conversationId.current = target.id
      setMessages(target.messages)
    } else {
      conversationId.current = crypto.randomUUID()
      setMessages([])
    }
  }, [activeId])

  useEffect(() => {
    if (messages.length) {
      chatHistory.upsert(conversationId.current, messages)
    }
  }, [messages])

  const answer = useCallback(async (question) => {
    const myEpoch = epoch.current
    setIsLoading(true)
    try {
      const data = await askQuestion(question, conversationId.current)
      if (myEpoch !== epoch.current) return
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'assistant', content: data.answer || '', data }
      ])
    } catch (err) {
      if (myEpoch !== epoch.current) return
      let errorMessage = 'Something went wrong. Please try again.'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          error: true,
          content: errorMessage,
          retryQuestion: question
        }
      ])
    } finally {
      if (myEpoch === epoch.current) setIsLoading(false)
    }
  }, [])

  const sendMessage = useCallback(
    async (text) => {
      const question = text.trim()
      if (!question || isLoading) return
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: question }])
      await answer(question)
    },
    [isLoading, answer]
  )

  const resetChat = useCallback(() => {
    epoch.current += 1
    setMessages([])
    setIsLoading(false)
    conversationId.current = crypto.randomUUID()
    lastActive.current = null
    chatHistory.startNew()
  }, [])

  const openRailAndAsk = useCallback(
    (question) => {
      setRailOpen(true)
      if (!question) return

      let finalQ = question.trim()
      const parts = []
      if (appliedFilters.date && appliedFilters.date !== 'All time') {
        parts.push(`period ${appliedFilters.date}`)
      }
      if (appliedFilters.cat && appliedFilters.cat !== 'All Categories') {
        parts.push(`category ${appliedFilters.cat}`)
      }
      if (appliedFilters.state && appliedFilters.state !== 'All States') {
        parts.push(`state ${appliedFilters.state}`)
      }

      if (parts.length > 0 && !finalQ.toLowerCase().includes('in state') && !finalQ.toLowerCase().includes('for period')) {
        const prefix = `[Filter: ${parts.join(', ')}] `
        finalQ = `${prefix}${finalQ}`.slice(0, 500)
      } else {
        finalQ = finalQ.slice(0, 500)
      }

      sendMessage(finalQ)
    },
    [appliedFilters, sendMessage]
  )

  return (
    <ChatContext.Provider
      value={{
        messages,
        isLoading,
        sendMessage,
        resetChat,
        conversationId: conversationId.current,
        railOpen,
        setRailOpen,
        appliedFilters,
        setAppliedFilters,
        useDashboardFilters,
        setUseDashboardFilters,
        openRailAndAsk
      }}
    >
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider')
  }
  return ctx
}

