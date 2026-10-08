// Puntos con signo: +12, 0, -3 (con un decimal solo si lo tiene, por el capitán x1.5)
export function formatSigned(n) {
  const value = Math.round((n ?? 0) * 10) / 10
  return value > 0 ? `+${value}` : `${value}`
}

export function firstName(displayName) {
  return displayName?.split(' ')[0] ?? ''
}

// Resultado respecto al par: -8, E, +2
export function formatToPar(n) {
  if (n == null) return '-'
  if (n === 0) return 'E'
  return n > 0 ? `+${n}` : `${n}`
}

export const formatPrice = (n) => `${n ?? '-'}M`

// Color para resultados de golf: bajo par es bueno (verde), sobre par es malo (rojo)
export function golfScoreClass(value) {
  if (value < 0) return 'text-pine-400'
  if (value > 0) return 'text-danger'
  return 'text-cream'
}

// Color para puntos de fantasy: positivo es bueno
export function pointsClass(value) {
  return value >= 0 ? 'text-gold-500' : 'text-danger'
}

const dateFormat = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
const shortDateFormat = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })

export const formatDateTime = (ms) => dateFormat.format(ms)

export function formatDateRange(start, end) {
  if (!start) return ''
  return `${shortDateFormat.format(new Date(start))} – ${shortDateFormat.format(new Date(end ?? start))}`
}

/** "2 d 4 h", "3 h 20 min", "12 min" */
export function formatCountdown(ms) {
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  if (days) return `${days} d ${hours} h`
  if (hours) return `${hours} h ${minutes % 60} min`
  return `${minutes} min`
}

// Fotos de ESPN al tamaño que se pintan (la original pesa unos 250 KB): ancho en px, proporción 350x254
export function sizedPhoto(url, width) {
  if (!url?.startsWith('https://a.espncdn.com/i/')) return url
  const path = url.replace('https://a.espncdn.com', '')
  return `https://a.espncdn.com/combiner/i?img=${path}&w=${width}&h=${Math.round((width * 254) / 350)}`
}
