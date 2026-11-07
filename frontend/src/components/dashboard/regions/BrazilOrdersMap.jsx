import { useMemo, useState } from 'react'
import BrazilDotMap from '../../charts/maps/BrazilDotMap'
import RegionShareList from './RegionShareList'
import { buildLegend } from '../../../utils/brazilMap'

export default function BrazilOrdersMap({ states }) {
  const [hovered, setHovered] = useState(null)
  const legend = useMemo(() => buildLegend(states), [states])

  if (legend.length === 0) {
    return <div className="flex min-h-[250px] items-center justify-center text-xs font-semibold text-slate-400">No data</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <BrazilDotMap states={states} hovered={hovered} onHover={setHovered} />
      <RegionShareList rows={legend} hovered={hovered} onHover={setHovered} />
    </div>
  )
}
