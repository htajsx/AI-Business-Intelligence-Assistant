import { motion } from 'framer-motion'
import { User } from 'lucide-react'

export default function UserMessage({ message, compact = false }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 18, y: 14 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="flex justify-end"
    >
      <div
        className={`flex flex-col items-end ${compact ? 'max-w-[92%]' : 'max-w-[85%] sm:max-w-[75%]'}`}
      >
        <div
          className={`mr-1 flex items-center gap-1.5 font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 ${compact ? 'mb-0.5 text-[10px]' : 'mb-1 text-[11.5px]'}`}
        >
          <User size={compact ? 11 : 13} />
          <span>You</span>
        </div>
        <div
          className={`whitespace-pre-wrap rounded-2xl rounded-tr-xs border border-indigo-400/30 bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/25 ${compact ? 'px-3 py-2 text-[12.5px] font-semibold leading-snug' : 'px-5 py-3 text-[15.5px] font-bold leading-relaxed'}`}
        >
          {message.content}
        </div>
      </div>
    </motion.div>
  )
}