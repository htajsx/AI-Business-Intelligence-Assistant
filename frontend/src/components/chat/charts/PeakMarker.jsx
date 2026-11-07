export default function PeakMarker({ cx, cy, label }) {
  if (!cx || !cy || !label) return null

  return (
    <g>
      <circle
        cx={cx}
        cy={cy}
        r={5.5}
        fill="#590907"
        stroke="#ffffff"
        strokeWidth={2.5}
        className="shadow-sm"
      />
      <foreignObject x={cx - 75} y={cy - 36} width={150} height={30}>
        <div className="flex items-center justify-center">
          <span className="rounded-full border border-indigo-200/90 bg-white/95 px-2.5 py-0.5 text-[10px] font-extrabold text-indigo-700 shadow-md backdrop-blur-md whitespace-nowrap dark:border-indigo-800/80 dark:bg-slate-900/95 dark:text-indigo-300">
            {label}
          </span>
        </div>
      </foreignObject>
    </g>
  )
}

