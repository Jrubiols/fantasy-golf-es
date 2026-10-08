// Momentos en directo: lo que ha pasado desde la última pasada del motor (eagles, hoyos en uno,
// rachas, rondas limpias) y los cambios de líder en las ligas. Funciones puras, sin Firestore.

const EMOJI = { ace: '⛳', eagle: '🦅', streak: '🔥', clean: '✨' }
const LABEL = { ace: 'Hoyo en uno', eagle: 'Eagle', streak: 'Racha de birdies', clean: 'Ronda sin bogeys' }

const eagles = (p) => (p?.holes?.eagles ?? 0) + (p?.holes?.albatross ?? 0)
const aces = (p) => (p?.scorecard ?? []).reduce((n, r) => n + r.strokes.filter((v) => v === 1).length, 0)

/**
 * Compara el estado anterior de cada jugador (prevById) con el nuevo.
 * Solo cuenta jugadores que ya tenían golpes guardados: así la primera pasada de un torneo no avisa de todo.
 * Un hoyo en uno es también un eagle: se cuenta solo como hoyo en uno.
 */
export function detectMoments(prevById, players) {
  const moments = []
  for (const p of players) {
    const prev = prevById.get(p.id)
    if (!prev?.holes) continue
    const newAces = aces(p) - aces(prev)
    const newEagles = eagles(p) - eagles(prev) - Math.max(0, newAces)
    const bonus = p.pointsBreakdown?.bonusDetail ?? {}
    const prevBonus = prev.pointsBreakdown?.bonusDetail ?? {}
    const push = (kind, count) => { if (count > 0) moments.push({ playerId: p.id, name: p.shortName ?? p.name, kind, count }) }
    push('ace', newAces)
    push('eagle', newEagles)
    push('streak', (bonus.streaks ?? 0) - (prevBonus.streaks ?? 0))
    push('clean', (bonus.bogeyFree ?? 0) - (prevBonus.bogeyFree ?? 0))
  }
  return moments
}

export const momentText = (m) => `${EMOJI[m.kind]} ${LABEL[m.kind]} de ${m.name}${m.count > 1 ? ` (×${m.count})` : ''}`

/** Los momentos grandes (eagle, hoyo en uno) también se cuentan en el Vestuario de cada liga. */
export const isBigMoment = (m) => m.kind === 'ace' || m.kind === 'eagle'

/**
 * Aviso agrupado para un usuario con los momentos de los golfistas de su equipo.
 * Devuelve { title, body } o null si no tiene ninguno.
 */
export function momentsMessage(moments) {
  if (!moments.length) return null
  if (moments.length === 1) {
    const m = moments[0]
    return { title: `¡${LABEL[m.kind]} de ${m.name}!`, body: 'Suma para tu equipo. Mira cómo va tu liga.' }
  }
  return { title: `Tu equipo está on fire: ${moments.length} momentos`, body: moments.map(momentText).join(' · ') }
}

/** Líder (o líderes empatados) de un grupo de equipos: [{ uid, points }] → uids con más puntos. */
export function leaders(teams) {
  if (!teams.length) return []
  const best = Math.max(...teams.map((t) => t.points))
  return teams.filter((t) => t.points === best).map((t) => t.uid).sort()
}
