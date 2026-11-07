import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { focusRing } from '../../../utils/ui'

export default function TryAskingButton({ onClick }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, x: 2 }}
      whileTap={{ scale: 0.95 }}
      className={`flex items-center gap-1.5 rounded-full border border-indigo-300 bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/40 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 ${focusRing}`}
    >
      <span>Query this KPI metric</span>
      <ArrowRight size={13} />
    </motion.button>
  )
}