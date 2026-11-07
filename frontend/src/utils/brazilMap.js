import { geoMercator, geoContains, geoCentroid, geoBounds, geoPath } from 'd3-geo'
import geoData from '../assets/geo/brazil-states.geo.json'
import { isNum } from './format'

export const MAP_WIDTH = 600
export const MAP_HEIGHT = 560
export const MAP_PADDING = 20
export const DOT_STEP = 6

export const TIER_COLORS = {
  top: ['#590907', '#8A3530', '#B7832A', '#C9A57A'],
  mid: '#C9B79A',
  rest: '#A5A79B'
}

export const OTHERS_COLOR = '#A5A79B'

export function getTierColor(rank) {
  if (rank <= 4) return TIER_COLORS.top[Math.max(rank, 1) - 1]
  if (rank <= 8) return TIER_COLORS.mid
  return TIER_COLORS.rest
}

export function sanitizeRows(rows) {
  if (!Array.isArray(rows)) return []
  return rows
    .filter((r) => r && typeof r.state === 'string' && isNum(r.orders) && r.orders >= 0)
    .sort((a, b) => b.orders - a.orders)
}

export function createProjection(width = MAP_WIDTH, height = MAP_HEIGHT, padding = MAP_PADDING) {
  return geoMercator().fitExtent(
    [
      [padding, padding],
      [width - padding, height - padding]
    ],
    geoData
  )
}

let dotsCache = null

export function buildDots(projection, step = DOT_STEP) {
  const key = `${projection.scale()}|${projection.translate().join(',')}|${step}`
  if (dotsCache && dotsCache.key === key) return dotsCache.dots

  const [[x0, y0], [x1, y1]] = geoPath(projection).bounds(geoData)
  const features = geoData.features.map((feature) => ({
    feature,
    state: feature.properties.sigla,
    bounds: geoBounds(feature)
  }))

  const dots = []
  for (let y = y0; y <= y1; y += step) {
    for (let x = x0; x <= x1; x += step) {
      const point = projection.invert([x, y])
      if (!point) continue
      for (const { feature, state, bounds } of features) {
        const [[west, south], [east, north]] = bounds
        if (point[0] < west || point[0] > east || point[1] < south || point[1] > north) continue
        if (geoContains(feature, point)) {
          dots.push({ x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, state })
          break
        }
      }
    }
  }

  dotsCache = { key, dots }
  return dots
}

export function getCentroids(projection) {
  const centroids = {}
  for (const feature of geoData.features) {
    const point = projection(geoCentroid(feature))
    if (point) centroids[feature.properties.sigla] = { x: point[0], y: point[1] }
  }
  return centroids
}

export function buildArcPath(from, to) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lift = Math.max(24, Math.hypot(dx, dy) * 0.35)
  const cx = (from.x + to.x) / 2
  const cy = (from.y + to.y) / 2 - lift
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${to.x.toFixed(1)} ${to.y.toFixed(1)}`
}

export function buildLegend(rows, topCount = 4) {
  const sorted = sanitizeRows(rows)
  const total = sorted.reduce((sum, r) => sum + r.orders, 0)
  const shareOf = (orders) => (total > 0 ? (orders / total) * 100 : 0)

  const top = sorted.slice(0, topCount).map((r, index) => ({
    key: r.state,
    state: r.state,
    name: r.name || r.state,
    orders: r.orders,
    share: shareOf(r.orders),
    color: getTierColor(index + 1)
  }))

  const rest = sorted.slice(topCount)
  if (rest.length === 0) return top

  const restOrders = rest.reduce((sum, r) => sum + r.orders, 0)
  return [
    ...top,
    {
      key: 'others',
      name: 'Others',
      orders: restOrders,
      share: shareOf(restOrders),
      color: OTHERS_COLOR,
      states: rest.map((r) => r.state)
    }
  ]
}

let modelCache = null

export function getMapModel() {
  if (modelCache) return modelCache
  const projection = createProjection()
  const dots = buildDots(projection)
  const byState = {}
  for (const dot of dots) {
    if (!byState[dot.state]) byState[dot.state] = []
    byState[dot.state].push(dot)
  }
  const path = geoPath(projection)
  const shapes = geoData.features.map((feature) => ({
    state: feature.properties.sigla,
    name: feature.properties.name,
    outline: path(feature),
    dots: byState[feature.properties.sigla] || []
  }))
  modelCache = { shapes, centroids: getCentroids(projection), dotCount: dots.length }
  return modelCache
}
