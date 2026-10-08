// «Más o Menos»: antes de cada ronda, preguntas sobre los golfistas destacados (birdies y golpes
// en la ronda) con una línea sacada de sus medias de la temporada. Gratis: solo puntos y orgullo.

export const PROPS_PER_ROUND = 8
export const STATS = {
  birdies: { label: 'birdies o mejor', short: 'birdies' },
  strokes: { label: 'golpes', short: 'golpes' },
}

const toHalf = (n) => Math.floor(n) + 0.5

/** Línea de birdies: su media por ronda, al medio punto (nunca hay empate). */
export const birdiesLine = (perRound) => toHalf(Math.max(1, perRound))

/** Línea de golpes: su media de la temporada ajustada al par del campo (las medias son sobre par ~71). */
export const strokesLine = (average, par) => toHalf(average + (par - 71) - 0.5)

/** Medias de un golfista a partir del resumen de ESPN (overview). */
export function seasonAverages(overview) {
  const birdies = Number(overview?.seasonRankings?.categories?.find((c) => c.name === 'birdiesPerRound')?.value)
  const split = overview?.statistics?.splits?.find((s) => /tour/i.test(s.displayName)) ?? overview?.statistics?.splits?.[0]
  const average = Number(split?.stats?.[4])
  return { birdies: Number.isFinite(birdies) ? birdies : null, average: Number.isFinite(average) && average > 60 ? average : null }
}

/** Resultado real de un golfista en una ronda desde su tarjeta; null si no la ha completado. */
export function roundStat(player, round, stat, holePars) {
  const strokes = player?.scorecard?.find((r) => r.round === round)?.strokes
  if (!strokes || strokes.some((v) => v == null)) return null
  if (stat === 'strokes') return strokes.reduce((a, b) => a + b, 0)
  return strokes.filter((v, i) => holePars[i + 1] && v < holePars[i + 1]).length
}

/** ¿Acertó? 'more' si salió por encima de la línea, 'less' si por debajo. */
export const outcome = (value, line) => (value == null ? null : value > line ? 'more' : 'less')
