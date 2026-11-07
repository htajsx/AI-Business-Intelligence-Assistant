export const SANS = "'Plus Jakarta Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"
export const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace"

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950'

export const cardShadow =
  'shadow-[0_2px_4px_rgba(0,0,0,0.4),0_7px_13px_-3px_rgba(0,0,0,0.3),inset_0_-3px_0_rgba(0,0,0,0.2)]'

export const card =
  'bg-white text-slate-800 shadow-[0_2px_4px_rgba(0,0,0,0.4),0_7px_13px_-3px_rgba(0,0,0,0.3),inset_0_-3px_0_rgba(0,0,0,0.2)] transition-all duration-200 dark:bg-slate-900 dark:text-slate-100'

export const divider = 'border-slate-100 dark:border-slate-800'

export const textPrimary = 'text-slate-900 dark:text-slate-50 font-semibold'
export const textSecondary = 'text-slate-600 dark:text-slate-400 font-medium'
export const muted = 'text-slate-500 dark:text-slate-400 font-medium'

const ghostCore = `cursor-pointer rounded-xl transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 active:scale-95 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 ${focusRing}`
export const ghostBtn = `p-2 ${ghostCore}`
export const iconBtn = `p-2.5 ${ghostCore}`
export const ghostBase = `rounded-xl p-2 transition-all duration-200 ${focusRing}`
export const kpiTile =
  'relative flex h-full min-h-[200px] flex-col gap-3 overflow-hidden rounded-2xl p-5 sm:p-6 ' + card

export const grid12 = 'grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12'
