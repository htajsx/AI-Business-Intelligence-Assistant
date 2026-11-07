export function svgToPngDataUrl(svgElement, { scale = 2, background = '#ffffff' } = {}) {
  return new Promise((resolve, reject) => {
    try {
      if (!svgElement) throw new Error('SVG element not found')

      const rect = svgElement.getBoundingClientRect()
      const width = Math.max(1, Math.round(rect.width))
      const height = Math.max(1, Math.round(rect.height))

      const clone = svgElement.cloneNode(true)
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')
      clone.setAttribute('width', String(width))
      clone.setAttribute('height', String(height))
      if (!clone.getAttribute('viewBox')) {
        clone.setAttribute('viewBox', `0 0 ${width} ${height}`)
      }

      const xml = new XMLSerializer().serializeToString(clone)
      const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`

      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = width * scale
        canvas.height = height * scale
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = background
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('Failed to rasterize SVG'))
      img.src = svgDataUrl
    } catch (err) {
      reject(err)
    }
  })
}