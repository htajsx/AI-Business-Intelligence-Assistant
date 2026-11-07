import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { askQuestion } from '../api/chatApi'
import { chatHistory } from '../components/layout/RightRail'

let counter = 0
const nextId = () => `msg-${++counter}`

export default function useChat({ initialMessages = [], pendingQuestion = null } = {}) {
  const restored = useRef(pendingQuestion ? null : chatHistory.getActive()).current

  const [messages, setMessages] = useState(restored ? restored.messages : initialMessages)
  const [isLoading, setIsLoading] = useState(Boolean(pendingQuestion))
  const conversationId = useRef(restored ? restored.id : crypto.randomUUID())
  const epoch = useRef(0)
  const booted = useRef(false)

  const activeId = useSyncExternalStore(
    chatHistory.subscribe,
    () => chatHistory.getSnapshot().activeId,
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
    if (messages.length) chatHistory.upsert(conversationId.current, messages)
  }, [messages])

  const answer = useCallback(async (question) => {
    const myEpoch = epoch.current
    setIsLoading(true)
    try {
      const data = await askQuestion(question, conversationId.current)
      if (myEpoch !== epoch.current) return
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: data.answer, data }])
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
          retryQuestion: question,
        },
      ])
    } finally {
      if (myEpoch === epoch.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!pendingQuestion || booted.current) return
    booted.current = true
    lastActive.current = null
    chatHistory.startNew()
    answer(pendingQuestion)
  }, [pendingQuestion, answer])

  const sendMessage = useCallback(
    async (text) => {
      const question = text.trim()
      if (!question || isLoading) return
      setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: question }])
      await answer(question)
    },
    [isLoading, answer],
  )

  const resetChat = useCallback(() => {
    epoch.current += 1
    setMessages([])
    setIsLoading(false)
    conversationId.current = crypto.randomUUID()
    lastActive.current = null
    chatHistory.startNew()
  }, [])

  return { messages, isLoading, sendMessage, resetChat }
}