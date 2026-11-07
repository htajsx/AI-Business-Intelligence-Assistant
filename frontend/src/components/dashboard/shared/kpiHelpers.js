// frontend/src/components/dashboard/kpiHelpers.js
export const SLA_DAYS = 12

export const isNum = (v) => typeof v === 'number' && Number.isFinite(v)

export const toNum = (v) => (v === null || v === undefined || v === '' ? NaN : Number(v))

export function toSeries(rows, pick) {
    if (!Array.isArray(rows)) return []
    return rows.map(pick).filter(isNum)
}

export function getTone(delta, lowerIsBetter = false) {
    if (!isNum(delta) || delta === 0) return 'neutral'
    const favorable = lowerIsBetter ? delta < 0 : delta > 0
    return favorable ? 'good' : 'bad'
}

export function periodTextOf(deltaLabel, comparison) {
    if (comparison?.previousStart && comparison?.previousEnd) {
        const ps = comparison.previousStart.slice(0, 10)
        const pe = comparison.previousEnd.slice(0, 10)
        if (ps.slice(0, 7) === pe.slice(0, 7)) {
            return 'vs ' + ps.slice(0, 7)
        }
        return 'vs ' + ps + ' – ' + pe
    }
    if (deltaLabel && deltaLabel !== 'MoM' && deltaLabel !== 'vs target') {
        if (deltaLabel === 'YoY') return 'vs last year'
        return deltaLabel
    }
    return 'vs previous period'
}

export function formatDeltaText(delta, unit = '%', digits = 1) {
    const n = Number(delta.toFixed(digits))
    return (n > 0 ? '+' : '') + n.toFixed(digits) + unit
}

export function formatKpiValue(value, format) {
    if (!isNum(value)) return 'No data'
    if (format === 'currency') return 'R$ ' + Math.round(value).toLocaleString('en-US')
    if (format === 'percent') return value.toFixed(1) + '%'
    if (format === 'score') return value.toFixed(2)
    if (format === 'days') return value.toFixed(2) + 'd'
    return Math.round(value).toLocaleString('en-US')
}

const HIGHER_IS_BETTER_SLOTS = ['revenue', 'orders', 'aov', 'onTime', 'review', 'repeat']

export function getAttentionItems(slots, comparisonAvailable = false) {
    const items = []

    if (comparisonAvailable) {
        const ord = slots?.orders
        if (ord && isNum(ord.delta) && ord.delta < 0) {
            items.push({
                slot: 'orders',
                kind: 'drop',
                text: 'Orders ' + formatDeltaText(ord.delta, '%', 1) + ' ' + periodTextOf(ord.deltaLabel)
            })
        }
    }

    const dt = slots?.deliveryTime
    if (dt && isNum(dt.value) && dt.value > SLA_DAYS) {
        items.push({
            slot: 'deliveryTime',
            kind: 'sla',
            text: 'Avg delivery ' + dt.value.toFixed(2) + 'd is above the ' + SLA_DAYS + 'd target'
        })
    }

    if (comparisonAvailable) {
        HIGHER_IS_BETTER_SLOTS.forEach((slot) => {
            if (slot === 'orders' || slot === 'repeat') return
            const kpi = slots?.[slot]
            if (kpi && isNum(kpi.delta) && kpi.delta < 0) {
                const isReview = slot === 'review'
                items.push({
                    slot,
                    kind: 'drop',
                    text: kpi.label + ' ' + formatDeltaText(kpi.delta, isReview ? '' : '%', isReview ? 2 : 1)
                })
            }
        })
    }

    return items
}
