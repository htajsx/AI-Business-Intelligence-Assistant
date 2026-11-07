export default function HeadlineBlock({ text }) {
  if (!text) return null

  return (
    <div className="mb-1 text-[17px] font-bold leading-snug tracking-tight text-slate-950 dark:text-slate-50">
      {text}
    </div>
  )
}

