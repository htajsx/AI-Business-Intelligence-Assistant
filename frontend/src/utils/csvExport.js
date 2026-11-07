export function exportTableToCsv(columns = [], rows = [], filename = 'data_export.csv') {
  if (!columns.length || !rows.length) return

  const header = columns.map((col) => `"${String(col).replace(/"/g, '""')}"`).join(',')
  const body = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col]
        if (val === null || val === undefined) return '""'
        return `"${String(val).replace(/"/g, '""')}"`
      })
      .join(',')
  )

  const csvContent = [header, ...body].join('\r\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

