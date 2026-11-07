export default function SectionHeader({ id, title, description, action }) {
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 id={id} className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
