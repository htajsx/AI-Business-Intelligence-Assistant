import { useState, useId, useMemo } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList
} from 'recharts'
import { BarChart3, LineChart as LineIcon, PieChart as PieIcon, AlignLeft } from 'lucide-react'
import { useIsDarkMode } from '../../../utils/theme'
import {
  CHART_PALETTE,
  CHART_TOKENS,
  getGridColor,
  getTickColor,
  formatChartValue,
  getChartHeight,
  humanizeLabel
} from '../shared/chartTheme'
import ChartTooltip from '../shared/ChartTooltip'
import HorizontalTick from '../shared/HorizontalTick'
import { resolveChartType, getAvailableChartTypes } from './chartTypeResolver'

export default function ChartRenderer({
  spec,
  rows = [],
  triggerKey = 'default',
  question = '',
  allowTypeSwitch = false,
  isChat = false,
  fillHeight = false
}) {
  const isDark = useIsDarkMode()
  const gid = useId().replace(/:/g, '')
  const [activeIndex, setActiveIndex] = useState(null)

  const enableTypeSwitch = allowTypeSwitch && !isChat

  const inferredType = useMemo(() => {
    if (!enableTypeSwitch) {
      const explicit = (spec?.type || 'bar').toLowerCase()
      if (explicit === 'composed') return 'combo'
      return explicit
    }
    return resolveChartType(spec, rows, question)
  }, [spec, rows, question, enableTypeSwitch])

  const [selectedType, setSelectedType] = useState(null)
  const activeType = selectedType || inferredType

  const availableTypes = useMemo(() => {
    if (!enableTypeSwitch) return []
    return getAvailableChartTypes(inferredType, rows)
  }, [enableTypeSwitch, inferredType, rows])

  const { chartData, xKey, yKey, yFormat, title, subtitle } = useMemo(() => {
    if (!spec || !Array.isArray(rows) || rows.length === 0) {
      return {
        chartData: [],
        xKey: spec?.x || 'category',
        yKey: spec?.y || 'value',
        yFormat: spec?.yFormat,
        title: spec?.title || '',
        subtitle: ''
      }
    }

    const xK = spec.x || Object.keys(rows[0] || {})[0] || 'x'
    const yK = spec.y || Object.keys(rows[0] || {}).find((k) => k !== xK) || 'y'

    let formattedRows = rows.map((r) => ({
      ...r,
      [xK]: r[xK] !== undefined && r[xK] !== null ? r[xK] : 'N/A',
      [yK]: typeof r[yK] === 'number' && Number.isFinite(r[yK]) ? r[yK] : 0
    }))

    if (activeType === 'horizontal_bar') {
      formattedRows = [...formattedRows].sort((a, b) => (b[yK] || 0) - (a[yK] || 0))
    }

    let sub = ''
    if (fillHeight) sub = ''
    else if (spec.yFormat === 'currency') sub = 'Values in BRL (R$)'
    else if (spec.yFormat === 'percent') sub = 'Percentage (%)'
    else if (spec.yFormat === 'score') sub = 'Score (1 - 5)'
    else if (spec.yFormat === 'days') sub = 'Days duration'

    return {
      chartData: formattedRows,
      xKey: xK,
      yKey: yK,
      yFormat: spec.yFormat,
      title: spec.title || '',
      subtitle: sub
    }
  }, [spec, rows, activeType, fillHeight])

  const height = useMemo(() => {
    if (fillHeight && activeType === 'horizontal_bar') {
      return Math.max(220, Math.min(400, chartData.length * 32 + 48))
    }
    return getChartHeight(chartData.length, activeType)
  }, [chartData.length, activeType, fillHeight])

  const totalSum = useMemo(() => {
    return chartData.reduce((acc, r) => acc + (typeof r[yKey] === 'number' ? r[yKey] : 0), 0)
  }, [chartData, yKey])

  const dynamicYWidth = useMemo(() => {
    if (!chartData.length) return 56
    const maxLen = Math.max(...chartData.map((r) => String(formatChartValue(r[yKey], yFormat)).length), 4)
    return Math.max(56, Math.min(100, Math.round(maxLen * 7.5 + 16)))
  }, [chartData, yKey, yFormat])

  const dynamicHBarYWidth = useMemo(() => {
    if (!chartData.length) return 95
    const maxLabelLen = Math.max(...chartData.map((r) => humanizeLabel(String(r[xKey])).length), 4)
    return Math.max(95, Math.min(150, Math.round(maxLabelLen * 6.5 + 16)))
  }, [chartData, xKey])

  if (!spec || !Array.isArray(rows) || rows.length === 0) {
    return (
      <div className="flex h-[220px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs font-medium text-slate-400 dark:border-slate-800 dark:text-slate-500">
        <p>No chart data available for this query</p>
      </div>
    )
  }

  const gridColor = getGridColor(isDark)
  const tickColor = getTickColor(isDark)

  const isScore = yFormat === 'score' || yKey.toLowerCase().includes('score')
  const isPercent = yFormat === 'percent'
  const yDomain = isScore ? [0, 5] : isPercent ? [0, 'auto'] : [0, 'auto']

  const showHeader = Boolean(title) || Boolean(subtitle) || (enableTypeSwitch && availableTypes.length > 1)

  const renderTypeIcon = (type) => {
    switch (type) {
      case 'horizontal_bar':
        return <AlignLeft size={13} />
      case 'line':
        return <LineIcon size={13} />
      case 'area':
        return <LineIcon size={13} />
      case 'donut':
        return <PieIcon size={13} />
      case 'bar':
      default:
        return <BarChart3 size={13} />
    }
  }

  const renderTypeLabel = (type) => {
    switch (type) {
      case 'horizontal_bar':
        return 'Horiz'
      case 'line':
        return 'Line'
      case 'area':
        return 'Area'
      case 'donut':
        return 'Donut'
      case 'combo':
        return 'Combo'
      case 'bar':
      default:
        return 'Bar'
    }
  }

  return (
    <div
      data-chart-capture
      className={fillHeight ? 'flex h-full min-h-0 w-full flex-1 flex-col px-1 pt-1' : 'w-full px-5 pt-4 pb-3'}
    >
      {showHeader && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {title && (
              <h4 className="truncate text-[13.5px] font-semibold text-slate-800 dark:text-slate-100">
                {humanizeLabel(title)}
              </h4>
            )}
            {subtitle && (
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {subtitle}
              </p>
            )}
          </div>

          {enableTypeSwitch && availableTypes.length > 1 && (
            <div className="flex shrink-0 items-center rounded-lg border border-slate-200/80 bg-slate-100/80 p-0.5 text-xs dark:border-slate-800 dark:bg-slate-900/80">
              {availableTypes.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedType(t)}
                  className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold transition-all ${activeType === t
                      ? 'bg-white text-indigo-600 shadow-xs dark:bg-slate-800 dark:text-indigo-400'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                >
                  {renderTypeIcon(t)}
                  <span>{renderTypeLabel(t)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        style={fillHeight ? { minHeight: height } : { height }}
        className={fillHeight ? 'relative w-full flex-1' : 'relative w-full'}
      >
        <div className={fillHeight ? 'absolute inset-0' : 'h-full w-full'}>
          <ResponsiveContainer width="100%" height="100%">
            {activeType === 'donut' ? (
              <div className="flex h-full w-full flex-col items-center justify-center sm:flex-row sm:gap-6">
                <div className="relative h-[200px] w-[200px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip content={<ChartTooltip yFormat={yFormat} />} />
                      <Pie
                        data={chartData}
                        dataKey={yKey}
                        nameKey={xKey}
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                        stroke={isDark ? '#1B1814' : '#ffffff'}
                        strokeWidth={2}
                      >
                        {chartData.map((entry, index) => {
                          const color = CHART_PALETTE[index % CHART_PALETTE.length]
                          const isHovered = activeIndex === index
                          const isDimmed = activeIndex !== null && !isHovered
                          return (
                            <Cell
                              key={`slice-${index}`}
                              fill={color}
                              opacity={isDimmed ? 0.35 : 1}
                              onMouseEnter={() => setActiveIndex(index)}
                              onMouseLeave={() => setActiveIndex(null)}
                            />
                          )
                        })}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Total
                    </span>
                    <span className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
                      {formatChartValue(totalSum, yFormat)}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex max-h-[190px] w-full flex-1 flex-col gap-1.5 overflow-y-auto pr-1 text-xs sm:mt-0">
                  {chartData.map((row, idx) => {
                    const color = CHART_PALETTE[idx % CHART_PALETTE.length]
                    const val = row[yKey] || 0
                    const pct = totalSum > 0 ? ((val / totalSum) * 100).toFixed(1) : '0'
                    const isHovered = activeIndex === idx
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setActiveIndex(idx)}
                        onMouseLeave={() => setActiveIndex(null)}
                        className={`flex items-center justify-between rounded-lg px-2.5 py-1 transition-colors ${isHovered
                            ? 'bg-slate-100 dark:bg-slate-800/80 font-bold'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                      >
                        <span className="flex min-w-0 items-center gap-2 truncate text-slate-700 dark:text-slate-300">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="truncate">{humanizeLabel(String(row[xKey]))}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-2 tabular-nums">
                          <span className="font-semibold text-slate-900 dark:text-slate-100">
                            {formatChartValue(val, yFormat)}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : activeType === 'horizontal_bar' ? (
              <BarChart
                key={`hbar-${triggerKey}-${activeType}`}
                data={chartData}
                layout="vertical"
                margin={{ top: 8, right: 36, bottom: 8, left: 10 }}
                barCategoryGap={CHART_TOKENS.bar.barCategoryGap}
                maxBarSize={CHART_TOKENS.bar.maxBarSize}
              >
                <defs>
                  <linearGradient id={`hbar-grad-${gid}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#590907" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#B9857D" stopOpacity={0.95} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  horizontal={false}
                  vertical={true}
                  stroke={gridColor}
                  strokeDasharray="3 3"
                />
                <XAxis
                  type="number"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                  tickFormatter={(v) => formatChartValue(v, yFormat)}
                />
                <YAxis
                  type="category"
                  dataKey={xKey}
                  axisLine={false}
                  tickLine={false}
                  width={dynamicHBarYWidth}
                  tickFormatter={(v) => humanizeLabel(String(v))}
                  tick={{ fill: tickColor, fontSize: 11, fontWeight: 600 }}
                />
                <Tooltip
                  content={<ChartTooltip yFormat={yFormat} />}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                />
                <Bar
                  dataKey={yKey}
                  fill={`url(#hbar-grad-${gid})`}
                  radius={CHART_TOKENS.bar.radiusHorizontal}
                  name={humanizeLabel(yKey)}
                  animationDuration={900}
                  animationEasing="ease-out"
                  barSize={fillHeight ? undefined : Math.max(18, Math.min(26, Math.floor(260 / (chartData.length || 1))))}
                >
                  {chartData.length <= 8 && (
                    <LabelList
                      dataKey={yKey}
                      position="right"
                      formatter={(val) => formatChartValue(val, yFormat)}
                      fill={tickColor}
                      fontSize={10.5}
                      fontWeight={600}
                    />
                  )}
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    />
                  ))}
                </Bar>
              </BarChart>
            ) : activeType === 'line' ? (
              <LineChart
                key={`line-${triggerKey}-${activeType}`}
                data={chartData}
                margin={{ top: 12, right: 28, bottom: 10, left: -6 }}
              >
                <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey={xKey}
                  axisLine={false}
                  tickLine={false}
                  tick={
                    <HorizontalTick
                      visibleTicksCount={chartData.length}
                      isDark={isDark}
                    />
                  }
                  interval={0}
                  height={38}
                />
                <YAxis
                  domain={yDomain}
                  tickFormatter={(v) => formatChartValue(v, yFormat)}
                  tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={dynamicYWidth}
                />
                <Tooltip
                  content={<ChartTooltip yFormat={yFormat} />}
                  cursor={{ stroke: '#590907', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Line
                  type="monotone"
                  dataKey={yKey}
                  stroke="#590907"
                  strokeWidth={2.8}
                  dot={
                    chartData.length <= 10
                      ? { r: 3.5, fill: '#590907', strokeWidth: 2, stroke: isDark ? '#26231E' : '#ffffff' }
                      : false
                  }
                  activeDot={{ r: 5.5, fill: '#590907', strokeWidth: 2, stroke: isDark ? '#26231E' : '#ffffff' }}
                  name={humanizeLabel(yKey)}
                  animationDuration={1000}
                  animationEasing="ease-out"
                />
              </LineChart>
            ) : activeType === 'area' ? (
              <AreaChart
                key={`area-${triggerKey}-${activeType}`}
                data={chartData}
                margin={{ top: 12, right: 28, bottom: 10, left: -6 }}
              >
                <defs>
                  <linearGradient id={`area-fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#590907" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#590907" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey={xKey}
                  axisLine={false}
                  tickLine={false}
                  tick={
                    <HorizontalTick
                      visibleTicksCount={chartData.length}
                      isDark={isDark}
                    />
                  }
                  interval={0}
                  height={38}
                />
                <YAxis
                  domain={yDomain}
                  tickFormatter={(v) => formatChartValue(v, yFormat)}
                  tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={dynamicYWidth}
                />
                <Tooltip
                  content={<ChartTooltip yFormat={yFormat} />}
                  cursor={{ stroke: '#590907', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey={yKey}
                  stroke="#590907"
                  strokeWidth={2.5}
                  fill={`url(#area-fill-${gid})`}
                  name={humanizeLabel(yKey)}
                  animationDuration={1100}
                  animationEasing="ease-out"
                />
              </AreaChart>
            ) : activeType === 'combo' ? (
              <ComposedChart
                key={`combo-${triggerKey}-${activeType}`}
                data={chartData}
                margin={{ top: 14, right: 18, bottom: 10, left: -6 }}
              >
                <defs>
                  <linearGradient id={`combo-bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#590907" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#590907" stopOpacity={0.85} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey={xKey}
                  axisLine={false}
                  tickLine={false}
                  tick={
                    <HorizontalTick
                      visibleTicksCount={chartData.length}
                      isDark={isDark}
                    />
                  }
                  interval={0}
                  height={38}
                />
                <YAxis
                  yAxisId="left"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                  tickFormatter={(v) => formatChartValue(v, yFormat)}
                  width={54}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#8A3530', fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(v) => formatChartValue(v, 'compact')}
                  width={50}
                />
                <Tooltip content={<ChartTooltip yFormat={yFormat} />} />
                <Bar
                  yAxisId="left"
                  dataKey={yKey}
                  fill={`url(#combo-bar-${gid})`}
                  radius={CHART_TOKENS.bar.radiusVertical}
                  name={humanizeLabel(yKey)}
                  maxBarSize={CHART_TOKENS.bar.maxBarSize}
                />
                {rows[0] &&
                  Object.keys(rows[0])
                    .filter((k) => k !== xKey && k !== yKey && typeof rows[0][k] === 'number')
                    .slice(0, 1)
                    .map((k) => (
                      <Line
                        key={k}
                        yAxisId="right"
                        type="monotone"
                        dataKey={k}
                        stroke="#8A3530"
                        strokeWidth={2.4}
                        dot={false}
                        name={humanizeLabel(k)}
                      />
                    ))}
              </ComposedChart>
            ) : (
              <BarChart
                key={`bar-${triggerKey}-${activeType}`}
                data={chartData}
                margin={{ top: 16, right: 16, bottom: 8, left: -6 }}
                barCategoryGap={CHART_TOKENS.bar.barCategoryGap}
                maxBarSize={CHART_TOKENS.bar.maxBarSize}
              >
                <defs>
                  <linearGradient id={`grad-bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#590907" stopOpacity={0.92} />
                    <stop offset="100%" stopColor="#470706" stopOpacity={0.88} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
                <XAxis
                  dataKey={xKey}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  tick={
                    <HorizontalTick
                      visibleTicksCount={chartData.length}
                      isDark={isDark}
                    />
                  }
                  height={38}
                />
                <YAxis
                  domain={yDomain}
                  tickFormatter={(v) => formatChartValue(v, yFormat)}
                  tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={dynamicYWidth}
                />
                <Tooltip
                  content={<ChartTooltip yFormat={yFormat} />}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}
                />
                <Bar
                  dataKey={yKey}
                  fill={`url(#grad-bar-${gid})`}
                  radius={CHART_TOKENS.bar.radiusVertical}
                  name={humanizeLabel(spec.barName || yKey)}
                  animationDuration={900}
                  animationEasing="ease-out"
                >
                  {chartData.length <= 8 && (
                    <LabelList
                      dataKey={yKey}
                      position="top"
                      formatter={(val) => formatChartValue(val, yFormat)}
                      fill={tickColor}
                      fontSize={10.5}
                      fontWeight={600}
                    />
                  )}
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.35}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}