import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Copy } from 'lucide-react'

export default function CopyButton({ text, label = false, className = '', size = 15 }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 1500)
    } catch (e) {
      console.error('Failed to copy', e)
    }
  }

  return (
    <button onClick={copy} aria-label={copied ? 'Copied' : 'Copy'} title="Copy to clipboard" className={className}>
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="ok"
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: [0.4, 1.25, 1], opacity: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400"
          >
            <Check size={size} className="stroke-[3]" />
            {label && <span>Copied</span>}
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="flex items-center gap-1.5 font-bold"
          >
            <Copy size={size} />
            {label && <span>Copy</span>}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
