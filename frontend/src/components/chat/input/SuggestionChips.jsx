import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, TrendingUp, Truck, Star } from 'lucide-react'
import { SUGGESTIONS } from '../../../config/constants'
import { card } from '../../../utils/ui'

export const SUGGESTION_ICONS = {
  bar: BarChart3,
  line: TrendingUp,
  truck: Truck,
  star: Star,
}

const CATEGORY_TAGS = {
  bar: 'Category Revenue',
  line: 'Sales Trends',
  truck: 'Logistics Performance',
  star: 'Reviews & Satisfaction',
}

export default function SuggestionChips({ onPick }) {
  return (
    <div className="grid w-full max-w-3xl gap-3.5 sm:grid-cols-2">
      {SUGGESTIONS.map(({ icon, text }, i) => {
        const Icon = SUGGESTION_ICONS[icon] || BarChart3
        const tag = CATEGORY_TAGS[icon] || 'Analytics'

        return (
          <motion.button
            key={text}
            onClick={() => onPick(text)}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 + i * 0.08, ease: 'easeOut' }}
            whileHover={{ y: -4, scale: 1.015 }}
            whileTap={{ scale: 0.98 }}
            className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl p-4 text-left shadow-sm transition-all duration-200 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:hover:border-indigo-400 dark:hover:shadow-[0_0_24px_-6px_rgba(89,9,7,0.35)] ${card}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Icon size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span className="text-[11.5px] font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                  {tag}
                </span>
              </div>
              <motion.div
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors group-hover:bg-indigo-50 group-hover:text-indigo-600 dark:bg-white/10 dark:text-slate-200 dark:group-hover:bg-indigo-500/20 dark:group-hover:text-indigo-300"
                whileHover={{ x: 2 }}
              >
                <ArrowRight size={15} />
              </motion.div>
            </div>

            <div className="mt-3 text-[14.5px] font-bold leading-snug text-slate-950 transition-colors group-hover:text-indigo-600 dark:text-white dark:group-hover:text-indigo-300">
              {text}
            </div>

            <div className="mt-2.5 flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-700 dark:text-slate-300">
              <span>Click to generate SQL &amp; render chart</span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}