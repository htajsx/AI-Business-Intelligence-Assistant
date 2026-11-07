import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

export default function Collapse({ open, children }) {
  const reduce = useReducedMotion()
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="content"
          initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          animate={reduce ? { opacity: 1 } : { height: 'auto', opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
          transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
