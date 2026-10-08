// Duelos cara a cara dentro de una liga: cada torneo, los que juegan se emparejan por
// el método del círculo (liguilla) y gana el que más puntos hace. Victoria 3, empate 1.
// Todo se deriva de los equipos publicados, así que no hace falta guardar nada más.

export const DUEL_POINTS = { win: 3, draw: 1, loss: 0 }

/**
 * Emparejamientos de la jornada `round` (0, 1, 2…) para una lista de uids.
 * Con número impar, uno descansa (rival null).
 */
export function pairings(uids, round) {
  const players = [...uids].sort()
  if (players.length % 2) players.push(null)
  const n = players.length
  if (n < 2) return []
  // Método del círculo: el primero queda fijo y el resto gira una posición por jornada
  const fixed = players[0]
  const rest = players.slice(1)
  const shift = round % rest.length
  const rotated = [...rest.slice(rest.length - shift), ...rest.slice(0, rest.length - shift)]
  const circle = [fixed, ...rotated]
  const pairs = []
  for (let i = 0; i < n / 2; i++) {
    const pair = [circle[i], circle[n - 1 - i]]
    // El que descansa (null) siempre en segundo lugar
    pairs.push(pair[0] === null ? [pair[1], null] : pair)
  }
  return pairs
}

/**
 * Duelos de una temporada. `tournaments`: [{ tournamentId, startDate, entries: [{ uid, points, final }] }]
 * ordenados del más antiguo al más reciente; solo cuentan los que juegan esa semana (y son de la liga).
 * Devuelve { weeks: [{ tournamentId, duels: [{ a, b, aPoints, bPoints, winner, final }] }], table: Map(uid → fila) }.
 */
export function seasonDuels(tournaments, memberIds) {
  const members = new Set(memberIds)
  const table = new Map(memberIds.map((uid) => [uid, { uid, played: 0, won: 0, drawn: 0, lost: 0, points: 0, for: 0 }]))
  const weeks = tournaments.map((t, round) => {
    const byUid = new Map(t.entries.filter((e) => members.has(e.uid)).map((e) => [e.uid, e]))
    const duels = pairings([...byUid.keys()], round).map(([a, b]) => {
      const ea = byUid.get(a)
      const eb = b ? byUid.get(b) : null
      const winner = !eb ? a : ea.points > eb.points ? a : eb.points > ea.points ? b : null
      const final = Boolean(ea.final && (!eb || eb.final))
      // Solo los torneos terminados suman a la tabla; los descansos no cuentan
      if (final && eb) {
        for (const me of [ea, eb]) {
          const row = table.get(me.uid)
          row.played++
          row.for = Math.round((row.for + me.points) * 10) / 10
          if (winner === null) { row.drawn++; row.points += DUEL_POINTS.draw }
          else if (winner === me.uid) { row.won++; row.points += DUEL_POINTS.win }
          else row.lost++
        }
      }
      return { a, b, aPoints: ea.points, bPoints: eb?.points ?? null, winner, final }
    })
    return { tournamentId: t.tournamentId, tournamentName: t.tournamentName, startDate: t.startDate, duels }
  })
  const sorted = [...table.values()].sort((x, y) => y.points - x.points || y.for - x.for)
  return { weeks, table: sorted }
}
