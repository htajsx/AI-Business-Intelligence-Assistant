import { motion, useReducedMotion } from 'framer-motion'
import { divider } from '../../../utils/ui'
import { SECTION_SCROLL_OFFSET } from '../lib/reportLayout'

export const getItemVariants = (reduce) => {
  return reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.2 } } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
      }
}

export default function ReportSection({
  id,
  title,
  icon: Icon,
  first = false,
  index,
  children,
}) {
  const reduce = useReducedMotion()

  return (
    <motion.section
      id={id}
      aria-labelledby={`${id}-title`}
      variants={getItemVariants(reduce)}
      style={{ scrollMarginTop: SECTION_SCROLL_OFFSET }}
      className={first ? '' : `border-t pt-8 ${divider}`}
    >
      <div className="mb-5 flex items-center gap-3">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-xs dark:bg-indigo-500/15 dark:text-indigo-400">
            <Icon size={18} aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          {index !== undefined && index !== null && (
            <span className="block text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Section {String(index).padStart(2, '0')}
            </span>
          )}
          <h2
            id={`${id}-title`}
            className="text-lg font-extrabold tracking-tight text-slate-950 sm:text-xl dark:text-white"
          >
            {title}
          </h2>
        </div>
      </div>
      {children}
    </motion.section>
  )
}
