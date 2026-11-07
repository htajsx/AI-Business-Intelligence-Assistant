import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUp, Mic, Paperclip, X, CornerDownLeft, Sparkles } from 'lucide-react'
import { SUGGESTIONS } from '../../../config/constants'
import { SUGGESTION_ICONS } from './SuggestionChips'
import { ghostBtn } from '../../../utils/ui'

const CHIPS = SUGGESTIONS.slice(0, 3)

export default function ChatInput({ onSend, disabled, hideChips }) {
  const [value, setValue] = useState('')
  const [ripple, setRipple] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [attachedFile, setAttachedFile] = useState(null)

  const ref = useRef(null)
  const typer = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  useEffect(() => () => {
    clearInterval(typer.current)
    if (window.recognition) window.recognition.stop()
  }, [])

  const canSend = (value.trim().length > 0 || attachedFile) && !disabled

  const submit = () => {
    if (!canSend) return

    let finalText = value.trim()
    if (attachedFile) {
      finalText = finalText ? `${finalText}\n[Attachment: ${attachedFile.name}]` : `[Attachment: ${attachedFile.name}]`
    }

    setRipple((n) => n + 1)
    onSend(finalText)
    setValue('')
    setAttachedFile(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      submit()
    }
  }

  const typeInto = (text) => {
    clearInterval(typer.current)
    ref.current?.focus()
    const step = Math.max(1, Math.ceil(text.length / 18))
    let i = 0
    setValue('')
    typer.current = setInterval(() => {
      i += step
      setValue(text.slice(0, i))
      if (i >= text.length) clearInterval(typer.current)
    }, 16)
  }

  const toggleListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert("Your browser does not support speech recognition. Please use Google Chrome or Microsoft Edge.")
      return
    }

    if (isListening) {
      window.recognition?.stop()
      setIsListening(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = false

    recognition.onstart = () => setIsListening(true)
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('')
      setValue(transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)

    window.recognition = recognition
    recognition.start()
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) setAttachedFile(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div>
      {!hideChips && (
        <div className="thin-scroll -mx-1 mb-2.5 flex gap-2 overflow-x-auto px-1 pb-1">
          {CHIPS.map(({ icon, text }, i) => {
            const Icon = SUGGESTION_ICONS[icon] || Sparkles
            return (
              <motion.button
                key={text}
                onClick={() => typeInto(text)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.05, duration: 0.25 }}
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white/95 px-3.5 py-1.5 text-xs font-bold text-slate-800 backdrop-blur shadow-xs transition-all hover:border-indigo-400 hover:text-indigo-600 hover:shadow-md dark:border-[#3D362F] dark:bg-[#211D18]/95 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-white"
              >
                <Icon size={13} className="text-indigo-500" />
                <span>{text}</span>
              </motion.button>
            )
          })}
        </div>
      )}

      <div className="relative">
        <AnimatePresence>
          {attachedFile && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute -top-11 left-0 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-900 shadow-sm dark:border-indigo-500/30 dark:bg-indigo-950 dark:text-indigo-200"
            >
              <Paperclip size={14} className="text-indigo-600 dark:text-indigo-400" />
              <span className="max-w-[220px] truncate">{attachedFile.name}</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="ml-1 rounded-full p-1 text-slate-600 hover:bg-white hover:text-red-500 dark:text-slate-300 dark:hover:bg-white/10"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-end gap-1.5 rounded-2xl border-2 border-slate-300 bg-white/95 p-2.5 shadow-xl shadow-slate-900/5 backdrop-blur-2xl transition-all duration-200 focus-within:border-indigo-600 focus-within:ring-4 focus-within:ring-indigo-500/20 focus-within:shadow-[0_0_32px_-6px_rgba(89,9,7,0.35)] dark:border-[#3D362F] dark:bg-[#1B1814]/95 dark:focus-within:border-indigo-500 dark:focus-within:ring-indigo-500/30">

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach data file"
            title="Attach data file / schema"
            className={`${ghostBtn} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl`}
          >
            <Paperclip size={20} className="text-slate-700 dark:text-slate-200" />
          </motion.button>

          <textarea
            ref={ref}
            data-chat-input
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="How can I help you today?"
            aria-label="Enter analytics query"
            className="thin-scroll max-h-28 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] font-semibold leading-relaxed text-slate-950 outline-none placeholder:font-medium placeholder:text-slate-500 dark:text-white dark:placeholder:text-slate-400"
          />

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleListening}
            aria-label="Voice input"
            title="Voice recognition"
            className={`${ghostBtn} flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isListening ? 'bg-red-500/15 text-red-500 animate-pulse border border-red-500/30' : ''
              }`}
          >
            <Mic size={20} className={isListening ? 'text-red-500' : 'text-slate-700 dark:text-slate-200'} />
          </motion.button>

          <motion.button
            onClick={submit}
            disabled={!canSend}
            aria-label="Send query"
            title="Send query (Enter)"
            whileHover={canSend ? { scale: 1.08 } : undefined}
            whileTap={canSend ? { scale: 0.92 } : undefined}
            className={`relative flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${canSend
              ? 'bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50'
              : 'cursor-not-allowed bg-slate-200 text-slate-400 dark:bg-white/10 dark:text-slate-600 shadow-none'
              }`}
          >
            {ripple > 0 && (
              <motion.span
                key={ripple}
                aria-hidden
                className="pointer-events-none absolute inset-0 rounded-xl bg-indigo-500"
                initial={{ scale: 0.8, opacity: 0.6 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            )}
            <ArrowUp size={20} className="relative stroke-[2.5]" />
          </motion.button>
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-center gap-3 text-center text-xs font-bold text-slate-700 dark:text-slate-300">
        <span className="flex items-center gap-1">
          <CornerDownLeft size={13} className="text-indigo-600 dark:text-indigo-400" />
          Press Enter to run query
        </span>
        <span>•</span>
        <span>Shift + Enter for new line</span>
        <span>•</span>
        <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">Automatic SQL Compilation &amp; Chart Rendering</span>
      </div>
    </div>
  )
}