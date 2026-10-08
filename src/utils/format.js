// Puntos con signo: +12, 0, -3
export function formatSigned(n) {
  return n > 0 ? `+${n}` : `${n}`
}

export function firstName(displayName) {
  return displayName?.split(' ')[0] ?? ''
}

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
