import { createElement } from 'react'
import { pdf } from '@react-pdf/renderer'
import { ReportPDF } from '../components/report/pdf/ReportPDF'
import { svgToPngDataUrl } from './svgToPng'

function forceLightTheme() {
  const root = document.documentElement
  const wasDark = root.classList.contains('dark')
  if (wasDark) root.classList.remove('dark')
  return () => {
    if (wasDark) root.classList.add('dark')
  }
}

export function printReport() {
  const restore = forceLightTheme()
  const done = () => {
    restore()
    window.removeEventListener('afterprint', done)
  }
  window.addEventListener('afterprint', done)
  window.print()
}

async function captureChartImage() {
  const container = document.querySelector('[data-chart-capture]')
  if (!container) return null
  const svg = container.querySelector('svg')
  if (!svg) return null
  try {
    return await svgToPngDataUrl(svg, { scale: 2, background: '#ffffff' })
  } catch (err) {
    console.warn('[exportReport] chart capture failed:', err)
    return null
  }
}

export async function downloadPdf(report, filename) {
  if (!report) throw new Error('Missing report data')

  const chartImage = await captureChartImage()

  const blob = await pdf(
    createElement(ReportPDF, { report, chartImage })
  ).toBlob()

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}