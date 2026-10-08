// Motor de Fantasy Golf: sincroniza ESPN con Firestore y calcula los puntos.
// Lo ejecuta GitHub Actions cada 15 minutos (scripts/sync.mjs). Es idempotente: si se ejecuta
// dos veces seguidas, la segunda no cambia nada.
import { Timestamp } from 'firebase-admin/firestore'
import { fetchLeaderboard, fetchScoreboard, parseHoleStats, parsePlayers, parseTournament } from '../src/lib/espn.js'
import { OWGR_URL, parseOwgr, priceField } from '../src/lib/pricing.js'
import { playerPoints, teamPoints } from '../src/lib/scoring.js'

export const defaultSources = {
  leaderboard: (eventId) => fetchLeaderboard(eventId),
  scoreboard: () => fetchScoreboard(),
  owgr: async () => {
    const res = await fetch(OWGR_URL, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) throw new Error(`OWGR respondió ${res.status}`)
    return res.json()
  },
}

const BATCH_LIMIT = 450

/** Escribe en lotes de menos de 500 operaciones (límite de Firestore). */
async function commitAll(db, writes) {
  for (let i = 0; i < writes.length; i += BATCH_LIMIT) {
    const batch = db.batch()
    for (const { ref, data } of writes.slice(i, i + BATCH_LIMIT)) batch.set(ref, data, { merge: true })
    await batch.commit()
  }
  return writes.length
}

/** JSON con las claves ordenadas: Firestore no conserva el orden de los campos. */
const stable = (value) => JSON.stringify(value ?? null, (_, v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))) : v)

/** ¿Tiene ya el documento guardado estos datos? Así no se reescribe lo que no ha cambiado. */
function sameData(stored, next) {
  if (!stored) return false
  return Object.entries(next).every(([key, value]) => stable(stored[key]) === stable(value))
}

/** Puesto con empates: [30, 25, 25, 10] → [1, 2, 2, 4] */
export function rankBy(items, score) {
  const sorted = [...items].sort((a, b) => score(b) - score(a))
  let rank = 0
  return sorted.map((item, i) => {
    if (i === 0 || score(item) !== score(sorted[i - 1])) rank = i + 1
    return { item, rank }
  })
}

export async function sync(db, { sources = defaultSources, now = new Date(), log = console.log } = {}) {
  const summary = { tournament: null, status: null, players: 0, priced: 0, entries: 0, standings: 0 }

  // 1. Torneo de la semana según ESPN (sin evento, el leaderboard devuelve el actual o el próximo)
  const leaderboard = await sources.leaderboard()
  const tournament = parseTournament(leaderboard)
  if (!tournament) {
    log('ESPN no devuelve ningún torneo')
    return summary
  }
  summary.tournament = tournament.name
  summary.status = tournament.status

  const tournamentRef = db.collection('tournaments').doc(tournament.id)
  const playersRef = tournamentRef.collection('players')
  const [storedTournamentSnap, storedPlayersSnap] = await Promise.all([tournamentRef.get(), playersRef.get()])
  const storedTournament = storedTournamentSnap.data()
  const storedPlayers = new Map(storedPlayersSnap.docs.map((d) => [d.id, d.data()]))

  // Un torneo cerrado y con la temporada ya actualizada no necesita más trabajo
  if (storedTournament?.finalized) {
    log(`${tournament.name}: terminado y procesado`)
    return summary
  }

  const players = parsePlayers(leaderboard)
  const firstTeeTime = new Date(tournament.firstTeeTime)
  const locked = now >= firstTeeTime

  // 2. Precios: se fijan una vez y no cambian; los jugadores que entran tarde se valoran al llegar
  const unpriced = players.filter((p) => storedPlayers.get(p.id)?.price == null)
  let prices = {}
  if (unpriced.length) {
    prices = priceField(players, parseOwgr(await sources.owgr()))
    summary.priced = unpriced.length
  }

  // 3. Golpes hoyo a hoyo: el scoreboard solo trae el torneo de esta semana
  let holes = {}
  if (tournament.status !== 'scheduled') {
    const holeStats = parseHoleStats(await sources.scoreboard(), tournament.holePars)
    if (holeStats.eventId === tournament.id) holes = holeStats.holes
  }

  const pointsById = {}
  const playerWrites = []
  for (const player of players) {
    const stored = storedPlayers.get(player.id) ?? {}
    const data = {
      ...player,
      price: stored.price ?? prices[player.id]?.price,
      owgr: stored.price != null ? stored.owgr ?? null : prices[player.id]?.owgr ?? null,
      // Si el scoreboard ya no trae este torneo, se conservan los últimos golpes guardados
      holes: holes[player.id] ?? stored.holes ?? null,
    }
    const points = playerPoints(data, tournament)
    data.points = points.total
    data.pointsBreakdown = points
    pointsById[player.id] = points.total
    if (!sameData(stored, data)) playerWrites.push({ ref: playersRef.doc(player.id), data })
  }
  summary.players = await commitAll(db, playerWrites)

  // 4. Datos del torneo y torneo actual
  const { holePars, ...tournamentData } = tournament
  await tournamentRef.set({ ...tournamentData, holePars, firstTeeTime: Timestamp.fromDate(firstTeeTime), updatedAt: Timestamp.fromDate(now) }, { merge: true })
  await db.doc('config/current').set({ tournamentId: tournament.id, updatedAt: Timestamp.fromDate(now) }, { merge: true })

  // 5. Desde la primera salida, los equipos se publican y puntúan
  if (locked) {
    const picksSnap = await db.collection('picks').where('tournamentId', '==', tournament.id).get()
    // Color y nombre de club de cada jugador, para pintar las clasificaciones sin más lecturas
    const userRefs = picksSnap.docs.map((d) => db.collection('users').doc(d.data().uid))
    const clubs = new Map((userRefs.length ? await db.getAll(...userRefs) : []).map((u) => [u.id, u.data() ?? {}]))
    const teams = picksSnap.docs.map((d) => {
      const p = d.data()
      return { id: d.id, ...p, points: teamPoints(p.playerIds, p.captainId, pointsById) }
    })
    const entryWrites = rankBy(teams, (t) => t.points).map(({ item: t, rank }) => ({
      ref: db.collection('entries').doc(t.id),
      data: {
        uid: t.uid,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        season: tournament.season,
        displayName: clubs.get(t.uid)?.displayName ?? t.displayName,
        photoURL: t.photoURL ?? null,
        color: clubs.get(t.uid)?.color ?? null,
        clubName: clubs.get(t.uid)?.clubName ?? null,
        playerIds: t.playerIds,
        captainId: t.captainId,
        cost: t.cost,
        points: t.points,
        rank,
        teamCount: teams.length,
        final: tournament.status === 'final',
        updatedAt: Timestamp.fromDate(now),
      },
    }))
    summary.entries = await commitAll(db, entryWrites)

    // 6. Al terminar: clasificación de la temporada, sumando todos los torneos ya cerrados
    if (tournament.status === 'final') {
      summary.standings = await updateSeasonStandings(db, tournament.season, now)
      await tournamentRef.set({ finalized: true }, { merge: true })
    }
  }

  log(`${tournament.name} (${tournament.status}): ${summary.players} jugadores actualizados, ${summary.priced} con precio nuevo, ${summary.entries} equipos, ${summary.standings} en la temporada`)
  return summary
}

export async function updateSeasonStandings(db, season, now = new Date()) {
  const entriesSnap = await db.collection('entries').where('season', '==', season).where('final', '==', true).get()
  const byUser = new Map()
  for (const doc of entriesSnap.docs) {
    const e = doc.data()
    const s = byUser.get(e.uid) ?? { uid: e.uid, displayName: e.displayName, photoURL: e.photoURL ?? null, color: e.color ?? null, clubName: e.clubName ?? null, points: 0, tournaments: 0, wins: 0, best: null }
    s.points = Math.round((s.points + e.points) * 10) / 10
    s.tournaments++
    if (e.rank === 1) s.wins++
    if (s.best == null || e.rank < s.best) s.best = e.rank
    byUser.set(e.uid, s)
  }
  const writes = rankBy([...byUser.values()], (s) => s.points).map(({ item, rank }) => ({
    ref: db.collection('seasons').doc(String(season)).collection('standings').doc(item.uid),
    data: { ...item, season, rank, updatedAt: Timestamp.fromDate(now) },
  }))
  return commitAll(db, writes)
}
