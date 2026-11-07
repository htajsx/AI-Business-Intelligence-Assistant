import { motion, useReducedMotion } from 'framer-motion'
import SectionHeader from './SectionHeader'

export default function DashboardSection({ id, index, title, description, action, scrollRoot, children }) {
  const reduce = useReducedMotion()
  const headingId = `${id}-heading`
  return (
    <motion.section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-32"
      initial={{ opacity: 0, y: reduce ? 0 : 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ root: scrollRoot ? { current: scrollRoot } : undefined, once: true, amount: 0.08 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <SectionHeader id={headingId} index={index} title={title} description={description} action={action} />
      <div className="space-y-5">{children}</div>
    </motion.section>
  )
}
