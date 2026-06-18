/** Byte / size formatting helpers shared across the app. */

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'] as const

/**
 * Format a byte count with a binary scale and always 2 decimal places
 * (except plain bytes, which are integers). e.g. 1536 -> "1.50 KB".
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${Math.round(bytes)} B`
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toFixed(2)} ${UNITS[unit]}`
}

/** Split a formatted size into value + unit for separate styling / tickers. */
export function splitBytes(bytes: number): { value: number; unit: string; raw: string } {
  if (!Number.isFinite(bytes) || bytes < 0) return { value: 0, unit: '', raw: '—' }
  if (bytes < 1024) return { value: Math.round(bytes), unit: 'B', raw: `${Math.round(bytes)} B` }
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit++
  }
  return { value, unit: UNITS[unit], raw: `${value.toFixed(2)} ${UNITS[unit]}` }
}

export function formatPercent(fraction: number, digits = 1): string {
  if (!Number.isFinite(fraction)) return '—'
  return `${(fraction * 100).toFixed(digits)}%`
}

export function formatRelativeTime(epochMs: number): string {
  if (!epochMs) return 'never'
  const diff = Date.now() - epochMs
  const sec = Math.round(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.round(sec / 60)
  if (min < 60) return `${min} min ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr} hr ago`
  const day = Math.round(hr / 24)
  if (day < 30) return `${day} day${day === 1 ? '' : 's'} ago`
  return new Date(epochMs).toLocaleDateString()
}

export function formatDate(epochMs: number): string {
  if (!epochMs) return '—'
  return new Date(epochMs).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
