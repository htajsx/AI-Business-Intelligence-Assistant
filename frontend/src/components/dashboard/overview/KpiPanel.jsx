import { card, focusRing } from '../../../utils/ui'

export function KpiPanel({ title, subtitle, bodyClassName = '', children }) {
    return (
        <div
            role="group"
            aria-label={title}
            className={`flex h-full flex-col overflow-hidden rounded-2xl ${card}`}
        >
            <header className="flex h-14 items-center justify-between border-b border-slate-100 px-5 sm:px-6 dark:border-slate-800">
                <div className="flex flex-wrap items-baseline gap-2.5">
                    <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                        {title}
                    </h3>
                    {subtitle && (
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {subtitle}
                        </span>
                    )}
                </div>
            </header>
            <div className={`grid flex-1 divide-slate-100 dark:divide-slate-800 ${bodyClassName}`}>
                {children}
            </div>
        </div>
    )
}

export function KpiPanelTile({ kpiId, label, title, className = '', children }) {
    return (
        <div
            data-kpi-id={kpiId}
            role="region"
            aria-label={label}
            title={title}
            tabIndex={0}
            className={`flex min-w-0 h-full scroll-mt-28 flex-col justify-between p-5 sm:p-6 ${focusRing} focus-visible:ring-inset focus-visible:ring-offset-0 ${className}`}
        >
            {children}
        </div>
    )
}
