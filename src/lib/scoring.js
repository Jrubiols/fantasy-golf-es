// Reglas de puntuación. Las comparten la web (para enseñarlas) y el motor (para calcular).
import { isEliminated } from './espn.js'

export const TEAM_SIZE = 6
export const BUDGET = 100
export const CAPTAIN_MULTIPLIER = 1.5

// Comodines: cada uno una vez por temporada
export const CHIPS = {
  triple: { name: 'Triple capitán', description: 'Tu capitán puntúa x3 en lugar de x1,5', captainMultiplier: 3, size: TEAM_SIZE },
  seventh: { name: 'Séptimo hombre', description: 'Juegas con 7 golfistas, con los mismos 100M', captainMultiplier: CAPTAIN_MULTIPLIER, size: TEAM_SIZE + 1 },
}

export const HOLE_POINTS = { albatross: 8, eagles: 5, birdies: 3, pars: 1, bogeys: -1, doubles: -2 }
export const CUT_POINTS = { made: 5, missed: -10 }

// Bonus por posición: [hasta el puesto, puntos]. Se aplica en directo con la posición actual.
export const POSITION_POINTS = [
  [1, 30], [2, 25], [3, 22], [4, 19], [5, 16],
  [10, 12], [15, 8], [20, 5], [30, 3],
]

/** Explicación de cada regla, para la pantalla de reglas. */
export const RULES = [
  { label: 'Albatros', points: HOLE_POINTS.albatross },
  { label: 'Eagle', points: HOLE_POINTS.eagles },
  { label: 'Birdie', points: HOLE_POINTS.birdies },
  { label: 'Par', points: HOLE_POINTS.pars },
  { label: 'Bogey', points: HOLE_POINTS.bogeys },
  { label: 'Doble bogey o peor', points: HOLE_POINTS.doubles },
  { label: 'Pasa el corte', points: CUT_POINTS.made },
  { label: 'No pasa el corte o se retira', points: CUT_POINTS.missed },
]

export function positionPoints(position) {
  if (!position) return 0
  return POSITION_POINTS.find(([upTo]) => position <= upTo)?.[1] ?? 0
}

/**
 * ¿Se ha resuelto ya el corte? Solo en torneos con corte, a partir de la ronda siguiente
 * o al terminar. Los retirados pierden puntos aunque el torneo no tenga corte.
 */
export function cutPoints(player, tournament) {
  if (isEliminated(player.status)) return CUT_POINTS.missed
  const hasCut = tournament.cutRound > 0
  const cutDone = tournament.status === 'final' || tournament.round > tournament.cutRound
  return hasCut && cutDone ? CUT_POINTS.made : 0
}

/** Puntos de un jugador con su desglose: { total, holes, position, cut } */
export function playerPoints(player, tournament) {
  const holes = Object.entries(HOLE_POINTS).reduce((sum, [key, pts]) => sum + (player.holes?.[key] ?? 0) * pts, 0)
  const position = positionPoints(player.position)
  const cut = cutPoints(player, tournament)
  return { total: holes + position + cut, holes, position, cut }
}

/** Puntos de un equipo: suma de sus jugadores, con el capitán multiplicado (x3 con el triple capitán). */
export function teamPoints(playerIds, captainId, pointsById, chip = null) {
  const multiplier = CHIPS[chip]?.captainMultiplier ?? CAPTAIN_MULTIPLIER
  const total = playerIds.reduce((sum, id) => sum + (pointsById[id] ?? 0) * (id === captainId ? multiplier : 1), 0)
  return Math.round(total * 10) / 10
}

/** Se retiró antes de dar un golpe (o ya no figura entre los inscritos). */
export const withdrewBeforeStart = (player) => !player || (player.status === 'wd' && !player.rounds?.length)

/**
 * Sustituto automático: cada golfista que se retira antes de jugar se cambia por el más caro
 * que quepa en el presupuesto y no esté ya en el equipo. Si era el capitán, el sustituto hereda
 * la capitanía. Devuelve { playerIds, captainId, substitutions: [{ out, in }] }.
 */
export function applySubstitutions(playerIds, captainId, players) {
  const byId = new Map(players.map((p) => [p.id, p]))
  const candidates = players
    .filter((p) => p.price != null && !withdrewBeforeStart(p))
    .sort((a, b) => b.price - a.price || a.id.localeCompare(b.id))

  let ids = [...playerIds]
  let captain = captainId
  const substitutions = []
  for (const outId of playerIds.filter((id) => withdrewBeforeStart(byId.get(id)))) {
    const spent = ids.filter((id) => id !== outId).reduce((sum, id) => sum + (byId.get(id)?.price ?? 0), 0)
    const replacement = candidates.find((p) => !ids.includes(p.id) && p.price <= BUDGET - spent)
    if (!replacement) continue
    ids = ids.map((id) => (id === outId ? replacement.id : id))
    if (captain === outId) captain = replacement.id
    substitutions.push({ out: outId, in: replacement.id })
  }
  return { playerIds: ids, captainId: captain, substitutions }
}
