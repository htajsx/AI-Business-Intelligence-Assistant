import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import AppLayout from '../components/layout/AppLayout'
import RightRail from '../components/layout/RightRail'
import ChatInput from '../components/chat/input/ChatInput'
import MessageList from '../components/chat/messages/MessageList'
import WelcomeScreen from '../components/chat/welcome/WelcomeScreen'
import { useChatContext } from '../context/ChatContext'

export default function ChatPage() {
  const location = useLocation()
  const pendingQuestion = location.state?.pendingQuestion ?? null

  const { messages, isLoading, sendMessage, resetChat } = useChatContext()
  const handledPending = useRef(false)

  useEffect(() => {
    if (pendingQuestion && !handledPending.current) {
      handledPending.current = true
      sendMessage(pendingQuestion)
    }
  }, [pendingQuestion, sendMessage])

  const scroller = useRef(null)
  const content = useRef(null)
  const stick = useRef(true)
  const [showPill, setShowPill] = useState(false)

  const isEmpty = messages.length === 0 && !isLoading

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const el = scroller.current
    if (el) el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const onScroll = () => {
    const el = scroller.current
    if (!el) return
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 80
    stick.current = near
    setShowPill(!near && !isEmpty)
  }

  useLayoutEffect(() => {
    if (!isEmpty) {
      scrollToBottom('auto')
    } else if (scroller.current) {
      scroller.current.scrollTo({ top: 0, behavior: 'auto' })
    }
  }, [scrollToBottom, isEmpty])

  useEffect(() => {
    if (isEmpty) return
    if (stick.current) scrollToBottom('smooth')
    else setShowPill(true)
  }, [messages.length, isLoading, scrollToBottom, isEmpty])

  useEffect(() => {
    const node = content.current
    if (!node || isEmpty) return
    const ro = new ResizeObserver(() => {
      if (stick.current) scrollToBottom('auto')
    })
    ro.observe(node)
    return () => ro.disconnect()
  }, [scrollToBottom, isEmpty])

  const handleSend = (text) => {
    stick.current = true
    sendMessage(text)
  }

  const handleNewChat = () => {
    stick.current = true
    setShowPill(false)
    resetChat()
    if (scroller.current) scroller.current.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <AppLayout rail={<RightRail onPick={handleSend} onNewChat={handleNewChat} />}>
      <div className="absolute inset-0">
        <div ref={scroller} onScroll={onScroll} className="thin-scroll h-full overflow-y-auto px-4 pb-52 pt-6">
          <div ref={content} className="mx-auto max-w-4xl">
            {isEmpty ? (
              <WelcomeScreen onPick={handleSend} />
            ) : (
              <MessageList messages={messages} isLoading={isLoading} onRetry={handleSend} />
            )}
          </div>
        </div>

        <AnimatePresence>
          {showPill && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 12 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                stick.current = true
                setShowPill(false)
                scrollToBottom('smooth')
              }}
              aria-label="Scroll to latest message"
              title="Scroll to latest message"
              className="absolute bottom-28 right-8 z-50 flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-indigo-600 text-white shadow-xl shadow-indigo-500/35 transition-all hover:bg-indigo-700 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <ArrowDown size={20} />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#F4EADA] via-[#F4EADA]/95 to-transparent px-4 pb-4 pt-12 dark:from-[#14110D] dark:via-[#14110D]/95">
          <div className="pointer-events-auto relative mx-auto max-w-4xl">
            <ChatInput onSend={handleSend} disabled={isLoading} hideChips={!isEmpty} />
          </div>
        </div>
      </div>
    </AppLayout>
  )
}