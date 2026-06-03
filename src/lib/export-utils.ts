/**
 * Data export utilities for downloading data as CSV or JSON files.
 */

/**
 * Escapes a CSV value by wrapping in double-quotes if it contains
 * commas, double-quotes, or newlines. Internal double-quotes are doubled.
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/**
 * Converts an array of objects to a CSV string with headers.
 */
function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return ''
  const headers = Object.keys(data[0])
  const headerRow = headers.map(escapeCsvValue).join(',')
  const rows = data.map((row) =>
    headers.map((h) => escapeCsvValue(row[h])).join(',')
  )
  return [headerRow, ...rows].join('\n')
}

/**
 * Exports an array of objects as a CSV file download.
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string): void {
  const csv = toCSV(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Exports an array of objects as a JSON file download.
 */
export function exportToJSON(data: Record<string, unknown>[], filename: string): void {
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename.endsWith('.json') ? filename : `${filename}.json`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
