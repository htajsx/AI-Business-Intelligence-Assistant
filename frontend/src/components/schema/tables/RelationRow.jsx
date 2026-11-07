import { ArrowRight } from 'lucide-react'
import { MONO } from '../../../utils/ui'

export default function RelationRow({ relation, highlight }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5 py-1.5">
      <span style={{ fontFamily: MONO }} className="text-[13px] font-bold text-slate-950 dark:text-white">
        {highlight(relation.column)}
      </span>
      <ArrowRight size={14} className="text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />
      <span style={{ fontFamily: MONO }} className="text-[13px] font-bold text-slate-950 dark:text-white">
        {highlight(relation.target)}
      </span>
      <span className="ml-auto rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-extrabold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">
        {relation.cardinality}
      </span>
    </div>
  )
}