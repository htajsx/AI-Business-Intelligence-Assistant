import CopyButton from '../../ui/CopyButton'
import { MONO } from '../../../utils/ui'

export default function FormulaBlock({ formula }) {
  return (
    <div className="relative mt-3 flex items-start rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-2.5 dark:border-[#36302A] dark:bg-[#211D18]">
      <code
        style={{ fontFamily: MONO }}
        className="flex-1 whitespace-pre-wrap pr-8 text-[12.5px] font-bold leading-relaxed text-indigo-700 dark:text-indigo-300"
      >
        {formula}
      </code>
      <div className="absolute right-2 top-2">
        <CopyButton text={formula} size={14} />
      </div>
    </div>
  )
}