import { motion } from 'framer-motion'
import FormulaBlock from './FormulaBlock'
import TryAskingButton from './TryAskingButton'
import { card, divider } from '../../../utils/ui'

export default function KpiDefinitionCard({ kpi, onAsk, highlight }) {
  const descriptionText = kpi?.description || kpi?.definition || ''
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      className={`flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:border-indigo-400 hover:shadow-lg dark:border-[#2F2A24] dark:bg-[#1B1814] dark:hover:border-indigo-500/50 ${card}`}
    >
      <div>
        <div className="flex items-start justify-between">
          <h3 className="text-[16px] font-extrabold tracking-tight text-slate-950 dark:text-white">
            {highlight(kpi?.name || '')}
          </h3>
        </div>
        
        <p className="mt-2 text-[13.5px] font-semibold leading-relaxed text-slate-800 dark:text-slate-200">
          {highlight(descriptionText)}
        </p>
        
        <div className="mt-3">
          <FormulaBlock formula={kpi?.formula || ''} />
        </div>
      </div>
      
      <div className={`mt-4 flex items-center justify-between border-t pt-3.5 ${divider}`}>
        <TryAskingButton onClick={() => onAsk(kpi?.question || '')} />
        <div className="flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <span>Governed Metric</span>
        </div>
      </div>
    </motion.div>
  )
}