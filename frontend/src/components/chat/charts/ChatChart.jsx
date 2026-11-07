import { useId, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ReferenceDot
} from 'recharts'
import { useIsDarkMode } from '../../../utils/theme'
import {
  CHART_PALETTE,
  CHART_TOKENS,
  getGridColor,
  getTickColor,
  formatChartValue,
  humanizeLabel
} from '../../charts/shared/chartTheme'
import ChartTooltip from '../../charts/shared/ChartTooltip'
import HorizontalTick from '../../charts/shared/HorizontalTick'
import ChatBrazilMap from './ChatBrazilMap'
import PeakMarker from './PeakMarker'

export default function ChatChart({ spec, rows = [], compact = false }) {
  const isDark = useIsDarkMode()
  const gid = useId().replace(/:/g, '')
  const [activeIndex, setActiveIndex] = useState(null)

  const { chartData, xKey, yKey, yFormat, title, subtitle, chartType, peakInfo } = useMemo(() => {
    if (!spec || !Array.isArray(rows) || rows.length === 0) {
      return {
        chartData: [],
        xKey: spec?.x || 'x',
        yKey: spec?.y || 'y',
        yFormat: spec?.yFormat,
        title: spec?.title || '',
        subtitle: spec?.subtitle || '',
        chartType: spec?.type || 'bar',
        peakInfo: null
      }
    }

    const xK = spec.x || Object.keys(rows[0] || {})[0] || 'x'
    const yK = spec.y || Object.keys(rows[0] || {}).find((k) => k !== xK) || 'y'
    let rawType = (spec.type || 'bar').toLowerCase()

    let formattedRows = rows.map((r) => ({
      ...r,
      [xK]: r[xK] !== undefined && r[xK] !== null ? r[xK] : 'N/A',
      [yK]: typeof r[yK] === 'number' && Number.isFinite(r[yK]) ? r[yK] : 0
    }))

    if (rawType === 'bar_horizontal' || rawType === 'bar') {
      const isTime = /month|date|year/i.test(xK) || /^\d{4}-\d{2}/.test(String(formattedRows[0]?.[xK] || ''))
      if (!isTime && rawType !== 'bar_horizontal') {
        rawType = 'bar_horizontal'
      }
    }

    if (rawType === 'bar_horizontal') {
      formattedRows = [...formattedRows].sort((a, b) => (b[yK] || 0) - (a[yK] || 0))
    }

    let peak = null
    if (rawType === 'area' || rawType === 'line') {
      let maxVal = -Infinity
      let maxIdx = -1
      formattedRows.forEach((r, idx) => {
        const v = r[yK]
        if (typeof v === 'number' && v > maxVal) {
          maxVal = v
          maxIdx = idx
        }
      })
      if (maxIdx >= 0 && maxVal > 0) {
        const xVal = formattedRows[maxIdx][xK]
        const formattedPeakVal = formatChartValue(maxVal, spec.yFormat)
        peak = {
          x: xVal,
          y: maxVal,
          label: `Peak · ${humanizeLabel(String(xVal))} · ${formattedPeakVal}`
        }
      }
    }

    let sub = spec.subtitle || ''
    if (!sub) {
      if (spec.yFormat === 'currency') sub = 'Values in BRL (R$)'
      else if (spec.yFormat === 'percent') sub = 'Percentage (%)'
      else if (spec.yFormat === 'score') sub = 'Score (1 - 5)'
    }

    return {
      chartData: formattedRows,
      xKey: xK,
      yKey: yK,
      yFormat: spec.yFormat,
      title: spec.title || `${humanizeLabel(yK)} by ${humanizeLabel(xK)}`,
      subtitle: sub,
      chartType: rawType,
      peakInfo: peak
    }
  }, [spec, rows])

  const dynamicYWidth = useMemo(() => {
    if (!chartData.length) return 56
    const maxLen = Math.max(...chartData.map((r) => String(formatChartValue(r[yKey], yFormat)).length), 4)
    return Math.max(56, Math.min(100, Math.round(maxLen * 7.5 + 16)))
  }, [chartData, yKey, yFormat])

  const dynamicHBarYWidth = useMemo(() => {
    if (!chartData.length) return 95
    const maxLabelLen = Math.max(...chartData.map((r) => humanizeLabel(String(r[xKey])).length), 4)
    return Math.max(95, Math.min(145, Math.round(maxLabelLen * 6.5 + 16)))
  }, [chartData, xKey])

  const height = useMemo(() => {
    if (compact) return 180
    if (chartType === 'brazil_map') return 340
    if (chartType === 'bar_horizontal') {
      return Math.max(220, Math.min(420, chartData.length * 34 + 50))
    }
    if (chartData.length <= 5) return 230
    if (chartData.length <= 10) return 270
    return 310
  }, [compact, chartType, chartData.length])

  const totalSum = useMemo(() => {
    return chartData.reduce((acc, r) => acc + (typeof r[yKey] === 'number' ? r[yKey] : 0), 0)
  }, [chartData, yKey])

  if (!spec || !Array.isArray(rows) || rows.length === 0) return null

  const gridColor = getGridColor(isDark)
  const tickColor = getTickColor(isDark)

  return (
    <div className="w-full px-5 pb-3 pt-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {title && (
            <h4 className="truncate text-[13.5px] font-bold text-slate-900 dark:text-slate-100">
              {humanizeLabel(title)}
            </h4>
          )}
          {subtitle && (
            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div style={{ height }} className="relative w-full">
        {chartType === 'brazil_map' ? (
          <ChatBrazilMap rows={chartData} xKey={xKey} yKey={yKey} yFormat={yFormat} />
        ) : chartType === 'donut' ? (
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
                    className={`flex items-center justify-between rounded-lg px-2.5 py-1 transition-colors ${
                      isHovered
                        ? 'bg-slate-100 font-bold dark:bg-slate-800/80'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate text-slate-700 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
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
        ) : chartType === 'bar_horizontal' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 8, right: 38, bottom: 8, left: 10 }}
              barCategoryGap="28%"
            >
              <defs>
                <linearGradient id={`hbar-grad-top-${gid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#590907" stopOpacity={1} />
                  <stop offset="100%" stopColor="#590907" stopOpacity={0.95} />
                </linearGradient>
                <linearGradient id={`hbar-grad-rest-${gid}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={isDark ? '#4F4F46' : '#CDBA9B'} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={isDark ? '#6A6C61' : '#A5A79B'} stopOpacity={0.9} />
                </linearGradient>
              </defs>
              <CartesianGrid horizontal={false} vertical={true} stroke={gridColor} strokeDasharray="3 3" />
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
              <Tooltip content={<ChartTooltip yFormat={yFormat} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
              <Bar
                dataKey={yKey}
                radius={CHART_TOKENS.bar.radiusHorizontal}
                barSize={Math.max(18, Math.min(26, Math.floor(260 / (chartData.length || 1))))}
                animationDuration={800}
                animationEasing="ease-out"
              >
                <LabelList
                  dataKey={yKey}
                  position="right"
                  formatter={(val) => formatChartValue(val, yFormat)}
                  fill={tickColor}
                  fontSize={10.5}
                  fontWeight={600}
                />
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={index === 0 ? `url(#hbar-grad-top-${gid})` : `url(#hbar-grad-rest-${gid})`}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseLeave={() => setActiveIndex(null)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : chartType === 'area' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 28, bottom: 10, left: -6 }}>
              <defs>
                <linearGradient id={`area-chat-${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#590907" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="#590907" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                tick={<HorizontalTick visibleTicksCount={chartData.length} isDark={isDark} />}
                interval={0}
                height={38}
              />
              <YAxis
                domain={[0, 'auto']}
                tickFormatter={(v) => formatChartValue(v, yFormat)}
                tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={dynamicYWidth}
              />
              <Tooltip content={<ChartTooltip yFormat={yFormat} />} cursor={{ stroke: '#590907', strokeWidth: 1, strokeDasharray: '3 3' }} />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke="#590907"
                strokeWidth={2.8}
                fill={`url(#area-chat-${gid})`}
                name={humanizeLabel(yKey)}
                animationDuration={900}
                animationEasing="ease-out"
              />
              {peakInfo && (
                <ReferenceDot
                  x={peakInfo.x}
                  y={peakInfo.y}
                  shape={<PeakMarker label={peakInfo.label} />}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 16, right: 28, bottom: 8, left: -6 }}>
              <defs>
                <linearGradient id={`grad-chat-bar-${gid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#590907" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#470706" stopOpacity={0.88} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke={gridColor} strokeDasharray="3 3" />
              <XAxis
                dataKey={xKey}
                axisLine={false}
                tickLine={false}
                interval={0}
                tick={<HorizontalTick visibleTicksCount={chartData.length} isDark={isDark} />}
                height={38}
              />
              <YAxis
                domain={[0, 'auto']}
                tickFormatter={(v) => formatChartValue(v, yFormat)}
                tick={{ fill: tickColor, fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                width={dynamicYWidth}
              />
              <Tooltip content={<ChartTooltip yFormat={yFormat} />} cursor={{ fill: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey={yKey} fill={`url(#grad-chat-bar-${gid})`} radius={CHART_TOKENS.bar.radiusVertical} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

