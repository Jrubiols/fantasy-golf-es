// Modo mercado de las ligas: subasta a ciegas antes del torneo y equipos exclusivos
// (cada golfista solo en un equipo de la liga). Datos en leagues/{id}/bids|teams|owners.
import { Timestamp } from 'firebase-admin/firestore'
import { BUDGET, TEAM_SIZE, teamPoints } from '../src/lib/scoring.js'

/** La subasta cierra 18 horas antes de la primera salida; después, mercado libre hasta la salida. */
export const AUCTION_LEAD_MS = 18 * 60 * 60 * 1000

/**
 * Resuelve las pujas: de la más alta a la más baja (empate: la primera en llegar), cada golfista
 * va al que más paga si aún le cabe en el presupuesto y tiene hueco. Pujas por debajo del precio
 * o por golfistas que no juegan no cuentan. Función pura.
 * bidsByUid: Map(uid → { bids: { pid: importe }, updatedAt: ms }) · priceById: Map(pid → precio)
 * Devuelve Map(uid → { playerIds, spent }) y la lista de adjudicaciones [{ pid, uid, amount }].
 */
export function resolveAuction(bidsByUid, priceById) {
  const offers = []
  for (const [uid, { bids, updatedAt }] of bidsByUid) {
    for (const [pid, raw] of Object.entries(bids ?? {})) {
      const amount = Math.round(Number(raw) * 2) / 2
      if (priceById.has(pid) && Number.isFinite(amount) && amount >= priceById.get(pid)) offers.push({ pid, uid, amount, updatedAt })
    }
  }
  offers.sort((a, b) => b.amount - a.amount || a.updatedAt - b.updatedAt)
  const teams = new Map([...bidsByUid.keys()].map((uid) => [uid, { playerIds: [], spent: 0 }]))
  const taken = new Set()
  const awards = []
  for (const o of offers) {
    const team = teams.get(o.uid)
    if (taken.has(o.pid) || team.playerIds.length >= TEAM_SIZE || team.spent + o.amount > BUDGET) continue
    team.playerIds.push(o.pid)
    team.spent = Math.round((team.spent + o.amount) * 10) / 10
    taken.add(o.pid)
    awards.push(o)
  }
  return { teams, awards }
}

/**
 * Para cada liga con mercado: resuelve la subasta cuando toca y, desde la primera salida,
 * puntúa los equipos de la liga. Devuelve las líneas para el Vestuario por liga (Map(lid → [texto])).
 */
export async function syncMarkets(db, { tournament, fieldById, pointsById, locked, now }) {
  const lines = new Map()
  const auctionAt = new Date(new Date(tournament.firstTeeTime).getTime() - AUCTION_LEAD_MS)
  const leagues = await db.collection('leagues').where('mode', '==', 'market').get()
  for (const leagueDoc of leagues.docs) {
    const league = leagueDoc.data()
    const state = league.market?.[tournament.id] ?? {}
    const say = (text) => lines.set(leagueDoc.id, [...(lines.get(leagueDoc.id) ?? []), text])

    // 1. Subasta: una vez, al cerrar el plazo de pujas
    if (!state.resolved && now >= auctionAt && fieldById.size) {
      const bidsSnap = await leagueDoc.ref.collection('bids').where('tournamentId', '==', tournament.id).get()
      const bidsByUid = new Map(league.memberIds.map((uid) => [uid, { bids: {}, updatedAt: Infinity }]))
      for (const d of bidsSnap.docs) {
        const b = d.data()
        if (bidsByUid.has(b.uid)) bidsByUid.set(b.uid, { bids: b.bids, updatedAt: b.updatedAt?.toMillis?.() ?? Infinity })
      }
      const priceById = new Map([...fieldById.values()].filter((p) => p.price != null).map((p) => [p.id, p.price]))
      const { teams, awards } = resolveAuction(bidsByUid, priceById)
      const names = new Map((await db.getAll(...league.memberIds.map((uid) => db.collection('users').doc(uid)))).map((u) => [u.id, u.data()?.displayName ?? 'Alguien']))
      const batch = db.batch()
      for (const [uid, team] of teams) {
        // Capitán por defecto: el más caro de los fichados
        const captainId = [...team.playerIds].sort((a, b) => priceById.get(b) - priceById.get(a))[0] ?? null
        batch.set(leagueDoc.ref.collection('teams').doc(`${tournament.id}_${uid}`), {
          uid, tournamentId: tournament.id, playerIds: team.playerIds, captainId, spent: team.spent,
          displayName: names.get(uid), updatedAt: Timestamp.fromDate(now),
        })
        for (const pid of team.playerIds) {
          batch.set(leagueDoc.ref.collection('owners').doc(`${tournament.id}_${pid}`), { uid, tournamentId: tournament.id, playerId: pid })
        }
      }
      batch.set(leagueDoc.ref, { market: { [tournament.id]: { resolved: true, resolvedAt: Timestamp.fromDate(now), awards: awards.length } } }, { merge: true })
      await batch.commit()
      const top = [...awards].sort((a, b) => b.amount - a.amount).slice(0, 3)
      say(awards.length
        ? `🔨 Subasta resuelta: ${awards.length} fichajes. ${top.map((a) => `${String(names.get(a.uid)).split(' ')[0]} se lleva a ${fieldById.get(a.pid)?.shortName} por ${String(a.amount).replace('.', ',')}M`).join(' · ')}. Ahora, mercado libre hasta la primera salida.`
        : '🔨 Subasta cerrada sin pujas. Mercado libre abierto hasta la primera salida.')
    }

    // 2. Desde la primera salida, los equipos de la liga puntúan
    if (locked && state.resolved) {
      const teamsSnap = await leagueDoc.ref.collection('teams').where('tournamentId', '==', tournament.id).get()
      const scored = teamsSnap.docs.map((d) => ({ ref: d.ref, ...d.data(), points: teamPoints(d.data().playerIds, d.data().captainId, pointsById) }))
      scored.sort((a, b) => b.points - a.points)
      const batch = db.batch()
      let rank = 0
      scored.forEach((t, i) => {
        if (i === 0 || t.points !== scored[i - 1].points) rank = i + 1
        batch.set(t.ref, {
          points: t.points, rank, teamCount: scored.length, final: tournament.status === 'final',
          season: tournament.season, tournamentName: tournament.name, startDate: tournament.startDate,
        }, { merge: true })
      })
      if (scored.length) await batch.commit()
    }
  }
  return lines
}
