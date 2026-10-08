// Equipo ideal: los 6 golfistas que más puntos habrían dado con 100M, con el mejor capitán.
// Es una mochila con número fijo de elementos: los precios van de 0,5 en 0,5, así que en
// "medios millones" el presupuesto son 200 unidades y la programación dinámica es exacta.
import { BUDGET, CAPTAIN_MULTIPLIER, TEAM_SIZE } from './scoring.js'

const UNITS = 2 // medio millón

/** Mejor selección de `size` jugadores con coste ≤ budget (en unidades). Devuelve { points, ids } o null. */
function bestSelection(players, size, budget) {
  // best[k][c] = mejor puntuación con k jugadores y coste exacto c; se guarda el camino para reconstruir
  const best = Array.from({ length: size + 1 }, () => new Float64Array(budget + 1).fill(-Infinity))
  const pick = Array.from({ length: size + 1 }, () => Array(budget + 1).fill(null))
  best[0][0] = 0
  players.forEach((p, i) => {
    for (let k = size; k >= 1; k--) {
      for (let c = budget; c >= p.cost; c--) {
        const candidate = best[k - 1][c - p.cost] + p.points
        if (candidate > best[k][c]) {
          best[k][c] = candidate
          pick[k][c] = { i, prev: pick[k - 1][c - p.cost] }
        }
      }
    }
  })
  let bestCost = -1
  for (let c = 0; c <= budget; c++) if (best[size][c] > (bestCost < 0 ? -Infinity : best[size][bestCost])) bestCost = c
  if (bestCost < 0 || best[size][bestCost] === -Infinity) return null
  const ids = []
  for (let node = pick[size][bestCost]; node; node = node.prev) ids.push(players[node.i].id)
  return { points: best[size][bestCost], ids }
}

/**
 * players: [{ id, price, points }]. Devuelve { playerIds, captainId, points, cost } o null.
 * Se prueba cada capitán posible entre los que más puntúan y se completa con los 5 mejores que quepan.
 */
export function idealTeam(players, { budget = BUDGET, size = TEAM_SIZE, captains = 25 } = {}) {
  const pool = players
    .filter((p) => p.price != null && Number.isFinite(p.points))
    .map((p) => ({ id: p.id, cost: Math.round(p.price * UNITS), points: p.points, price: p.price }))
  if (pool.length < size) return null

  let result = null
  const candidates = [...pool].sort((a, b) => b.points - a.points).slice(0, captains)
  for (const captain of candidates) {
    const rest = bestSelection(pool.filter((p) => p.id !== captain.id), size - 1, budget * UNITS - captain.cost)
    if (!rest) continue
    const points = rest.points + captain.points * CAPTAIN_MULTIPLIER
    if (!result || points > result.points) result = { captainId: captain.id, playerIds: [captain.id, ...rest.ids], points }
  }
  if (!result) return null
  const byId = new Map(pool.map((p) => [p.id, p]))
  return {
    ...result,
    points: Math.round(result.points * 10) / 10,
    cost: result.playerIds.reduce((sum, id) => sum + byId.get(id).price, 0),
  }
}

/** Puntos por millón: quién ha rendido más para lo que costaba. */
export function bestValue(players, count = 3) {
  return players
    .filter((p) => p.price && Number.isFinite(p.points) && p.points > 0)
    .map((p) => ({ ...p, perMillion: Math.round((p.points / p.price) * 10) / 10 }))
    .sort((a, b) => b.perMillion - a.perMillion)
    .slice(0, count)
}
