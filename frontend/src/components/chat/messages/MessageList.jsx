import AssistantMessage from './AssistantMessage'
import TypingSteps from './TypingSteps'
import UserMessage from './UserMessage'

export default function MessageList({ messages, isLoading, onRetry }) {
  const questionBefore = (index) => {
    for (let i = index - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].content
    }
    return null
  }

  return (
    <div className="space-y-6" role="log">
      {messages.map((m, i) => {
        if (m.role === 'user') return <UserMessage key={m.id} message={m} />
        const q = questionBefore(i)
        return (
          <AssistantMessage
            key={m.id}
            message={m}
            question={q}
            onRetry={onRetry}
            onRegenerate={q && !isLoading ? () => onRetry(q) : undefined}
          />
        )
      })}
      {isLoading && <TypingSteps />}
    </div>
  )
}
