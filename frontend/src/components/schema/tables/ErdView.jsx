import { card, MONO } from '../../../utils/ui'

const NODES = [
  { id: 'customers', label: 'customers', x: 50, y: 150, cols: ['customer_id (PK)'] },
  { id: 'orders', label: 'orders', x: 250, y: 150, cols: ['order_id (PK)', 'customer_id'] },
  { id: 'order_items', label: 'order_items', x: 480, y: 150, cols: ['order_id', 'product_id', 'seller_id'] },
  { id: 'products', label: 'products', x: 700, y: 50, cols: ['product_id (PK)'] },
  { id: 'sellers', label: 'sellers', x: 700, y: 250, cols: ['seller_id (PK)'] },
  { id: 'order_payments', label: 'order_payments', x: 250, y: 320, cols: ['order_id'] },
  { id: 'order_reviews', label: 'order_reviews', x: 250, y: 30, cols: ['review_id', 'order_id'] }
]

const EDGES = [
  { from: 'orders', to: 'customers', start: [250, 180], end: [190, 180] },
  { from: 'order_items', to: 'orders', start: [480, 180], end: [390, 180] },
  { from: 'order_items', to: 'products', start: [620, 160], end: [700, 80], ctrl: [660, 160, 660, 80] },
  { from: 'order_items', to: 'sellers', start: [620, 200], end: [700, 280], ctrl: [660, 200, 660, 280] },
  { from: 'order_payments', to: 'orders', start: [320, 320], end: [320, 240] },
  { from: 'order_reviews', to: 'orders', start: [320, 90], end: [320, 150] }
]

export default function ErdView() {
  return (
    <div className={`overflow-x-auto rounded-2xl border border-slate-200/90 bg-white p-7 shadow-xs dark:border-[#2F2A24] dark:bg-[#1B1814] ${card}`}>
      <div className="min-w-[900px]">
        <svg viewBox="0 0 900 450" className="h-auto w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            <marker id="dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5">
              <circle cx="5" cy="5" r="5" className="fill-indigo-600 dark:fill-indigo-400" />
            </marker>
          </defs>
          
          {EDGES.map((e, i) => {
            const d = e.ctrl
              ? `M ${e.start[0]} ${e.start[1]} C ${e.ctrl[0]} ${e.ctrl[1]}, ${e.ctrl[2]} ${e.ctrl[3]}, ${e.end[0]} ${e.end[1]}`
              : `M ${e.start[0]} ${e.start[1]} L ${e.end[0]} ${e.end[1]}`
            return (
              <path
                key={i}
                d={d}
                fill="none"
                className="stroke-indigo-500/80 dark:stroke-indigo-400/80"
                strokeWidth="2"
                markerStart="url(#dot)"
                markerEnd="url(#dot)"
              />
            )
          })}

          {NODES.map((n) => (
            <g key={n.id} transform={`translate(${n.x}, ${n.y})`}>
              <rect
                width="146"
                height={40 + n.cols.length * 22}
                rx="10"
                className="fill-white stroke-slate-300 dark:fill-[#211D18] dark:stroke-[#3D362F] shadow-sm"
                strokeWidth="1.5"
              />
              <text x="14" y="24" className="fill-indigo-700 font-extrabold dark:fill-indigo-300" fontSize="13" fontFamily={MONO}>
                {n.label}
              </text>
              <line x1="0" y1="38" x2="146" y2="38" className="stroke-slate-200 dark:stroke-[#2F2A24]" strokeWidth="1.5" />
              {n.cols.map((c, i) => {
                const isPk = c.includes('(PK)')
                const label = c.replace(' (PK)', '')
                return (
                  <g key={i} transform={`translate(14, ${56 + i * 22})`}>
                    {isPk && <circle cx="0" cy="-4" r="3.5" className="fill-amber-500" />}
                    <text x={isPk ? 10 : 0} y="0" className="fill-slate-900 font-bold dark:fill-slate-100" fontSize="11.5" fontFamily={MONO}>
                      {label}
                    </text>
                  </g>
                )
              })}
            </g>
          ))}
          
          <g transform="translate(780, 410)">
            <rect width="108" height="34" rx="8" className="fill-white stroke-slate-300 dark:fill-[#211D18] dark:stroke-[#3D362F]" strokeWidth="1.5" />
            <circle cx="16" cy="17" r="3.5" className="fill-amber-500" />
            <text x="26" y="21" className="fill-slate-900 font-bold dark:fill-white" fontSize="11" fontFamily={MONO}>Primary Key</text>
          </g>
        </svg>
      </div>
    </div>
  )
}