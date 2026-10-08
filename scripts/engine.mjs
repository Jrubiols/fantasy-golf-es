// Motor de Fantasy Golf: sincroniza ESPN con Firestore y calcula los puntos.
// Lo ejecuta GitHub Actions cada 15 minutos (scripts/sync.mjs). Es idempotente: si se ejecuta
// dos veces seguidas, la segunda no cambia nada.
import { Timestamp } from 'firebase-admin/firestore'
import { fetchLeaderboard, fetchScoreboard, isEliminated, parseHoleStats, parsePlayers, parseTournament } from '../src/lib/espn.js'
import { OWGR_URL, parseOwgr, priceField } from '../src/lib/pricing.js'
import { applySubstitutions, CHIPS, playerPoints, teamPoints } from '../src/lib/scoring.js'
import { DEADLINE_WARNING_MS, formatMadrid, notify } from './notify.mjs'
import { detectMoments, isBigMoment, leaders, momentsMessage, momentText } from './moments.mjs'

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

// `messenger` envía los avisos al móvil (getMessaging() de firebase-admin); sin él no se avisa a nadie
export async function sync(db, { sources = defaultSources, now = new Date(), log = console.log, messenger = null } = {}) {
  const summary = { tournament: null, status: null, players: 0, priced: 0, entries: 0, standings: 0, notified: 0 }

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
  let cards = {}
  if (tournament.status !== 'scheduled') {
    const holeStats = parseHoleStats(await sources.scoreboard(), tournament.holePars)
    if (holeStats.eventId === tournament.id) ({ holes, cards } = holeStats)
  }

  const pointsById = {}
  const fieldPlayers = []
  const playerWrites = []
  for (const player of players) {
    const stored = storedPlayers.get(player.id) ?? {}
    const data = {
      ...player,
      price: stored.price ?? prices[player.id]?.price,
      owgr: stored.price != null ? stored.owgr ?? null : prices[player.id]?.owgr ?? null,
      // Si el scoreboard ya no trae este torneo, se conservan los últimos golpes guardados
      holes: holes[player.id] ?? stored.holes ?? null,
      // Tarjeta hoyo a hoyo para la ficha del jugador
      scorecard: cards[player.id] ?? stored.scorecard ?? null,
    }
    const points = playerPoints(data, tournament)
    data.points = points.total
    data.pointsBreakdown = points
    pointsById[player.id] = points.total
    fieldPlayers.push(data)
    if (!sameData(stored, data)) playerWrites.push({ ref: playersRef.doc(player.id), data })
  }
  summary.players = await commitAll(db, playerWrites)

  // 4. Datos del torneo y torneo actual
  const { holePars, ...tournamentData } = tournament
  await tournamentRef.set({ ...tournamentData, holePars, firstTeeTime: Timestamp.fromDate(firstTeeTime), updatedAt: Timestamp.fromDate(now) }, { merge: true })
  await db.doc('config/current').set({ tournamentId: tournament.id, updatedAt: Timestamp.fromDate(now) }, { merge: true })

  // Avisos antes del cierre: al publicarse los precios y 3 horas antes (solo a quien no tiene equipo).
  // Cada aviso se envía una vez: queda apuntado en tournaments/{id}.notified
  const notified = { ...(storedTournament?.notified ?? {}) }
  const sentBefore = JSON.stringify(notified)
  if (!locked && players.length && messenger) {
    const lastHours = now.getTime() >= firstTeeTime.getTime() - DEADLINE_WARNING_MS
    if (lastHours && !notified.deadline) {
      const picksSnap = await db.collection('picks').where('tournamentId', '==', tournament.id).get()
      summary.notified += await notify(db, messenger, {
        exclude: new Set(picksSnap.docs.map((d) => d.data().uid)),
        messages: () => ({ title: 'Últimas horas para hacer tu equipo', body: `${tournament.name} se cierra el ${formatMadrid(firstTeeTime)}. Elige a tus 6 golfistas.`, path: '/draft' }),
      })
      notified.deadline = notified.open = true
    } else if (!lastHours && !notified.open) {
      summary.notified += await notify(db, messenger, {
        messages: () => ({ title: `Ya puedes hacer tu equipo: ${tournament.name}`, body: `Los precios están listos. Se cierra el ${formatMadrid(firstTeeTime)}.`, path: '/draft' }),
      })
      notified.open = true
    }
  }

  // 5. Desde la primera salida, los equipos se publican y puntúan
  if (locked) {
    const picksSnap = await db.collection('picks').where('tournamentId', '==', tournament.id).get()
    // Color y nombre de club de cada jugador, para pintar las clasificaciones sin más lecturas
    const userRefs = picksSnap.docs.map((d) => db.collection('users').doc(d.data().uid))
    const clubs = new Map((userRefs.length ? await db.getAll(...userRefs) : []).map((u) => [u.id, u.data() ?? {}]))
    // Comodines ya gastados esta temporada en torneos anteriores: uid → Set(comodines)
    const usedChips = new Map()
    const chipsSnap = await db.collection('entries').where('season', '==', tournament.season).where('chip', 'in', ['triple', 'seventh']).get()
    for (const doc of chipsSnap.docs) {
      const e = doc.data()
      if (e.tournamentId === tournament.id || (e.startDate ?? '') >= (tournament.startDate ?? '')) continue
      usedChips.set(e.uid, new Set([...(usedChips.get(e.uid) ?? []), e.chip]))
    }
    const fieldById = new Map(fieldPlayers.map((p) => [p.id, p]))
    const teams = picksSnap.docs.map((d) => {
      const raw = d.data()
      const chip = raw.chip && !usedChips.get(raw.uid)?.has(raw.chip) ? raw.chip : null
      // Sin comodín válido, el séptimo jugador no cuenta
      const p = { ...raw, chip, requestedChip: raw.chip ?? null, playerIds: chip === 'seventh' ? raw.playerIds : raw.playerIds.slice(0, 6) }
      // Quien se retira antes de jugar se sustituye solo (ver applySubstitutions)
      const team = applySubstitutions(p.playerIds, p.captainId, fieldPlayers)
      return { id: d.id, ...p, ...team, originalPlayerIds: p.playerIds, points: teamPoints(team.playerIds, team.captainId, pointsById, chip) }
    })
    const entryWrites = rankBy(teams, (t) => t.points).map(({ item: t, rank }) => ({
      ref: db.collection('entries').doc(t.id),
      data: {
        uid: t.uid,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        startDate: tournament.startDate,
        season: tournament.season,
        displayName: clubs.get(t.uid)?.displayName ?? t.displayName,
        photoURL: t.photoURL ?? null,
        color: clubs.get(t.uid)?.color ?? null,
        clubName: clubs.get(t.uid)?.clubName ?? null,
        playerIds: t.playerIds,
        captainId: t.captainId,
        substitutions: t.substitutions,
        chip: t.chip ?? null,
        stats: teamStats(t.playerIds, t.captainId, fieldById, tournament),
        chipRejected: Boolean(t.requestedChip) && !t.chip,
        cost: t.cost,
        points: t.points,
        rank,
        teamCount: teams.length,
        final: tournament.status === 'final',
        updatedAt: Timestamp.fromDate(now),
      },
    }))
    summary.entries = await commitAll(db, entryWrites)

    // 5b. En directo: momentos de los golfistas, cambios de líder y mensajes del Vestuario
    summary.notified += await liveEvents(db, { tournament, teams, fieldPlayers, storedPlayers, messenger, now })

    // 6. Al terminar: clasificación de la temporada, sumando todos los torneos ya cerrados
    if (tournament.status === 'final') {
      summary.standings = await updateSeasonStandings(db, tournament.season, now)
      // Aviso con el resultado de cada uno
      if (messenger && !notified.results && entryWrites.length) {
        const byUid = new Map(entryWrites.map(({ data }) => [data.uid, data]))
        summary.notified += await notify(db, messenger, {
          uids: [...byUid.keys()],
          messages: (uid) => {
            const e = byUid.get(uid)
            const title = e.rank === 1 ? `¡Has ganado el ${tournament.name}!` : `${tournament.name}: terminaste ${e.rank}º de ${e.teamCount}`
            return { title, body: `${String(e.points).replace('.', ',')} puntos. Mira cómo queda tu liga.`, path: '/league' }
          },
        })
        notified.results = true
      }
      await tournamentRef.set({ finalized: true }, { merge: true })
    }
  }

  if (JSON.stringify(notified) !== sentBefore) await tournamentRef.set({ notified }, { merge: true })

  log(`${tournament.name} (${tournament.status}): ${summary.players} jugadores actualizados, ${summary.priced} con precio nuevo, ${summary.entries} equipos, ${summary.standings} en la temporada, ${summary.notified} avisos`)
  return summary
}

const firstName = (name) => String(name ?? 'Alguien').split(' ')[0]
const joinNames = (names) => (names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : names[0])
const formatPoints = (n) => String(n).replace('.', ',')

/**
 * Lo que ha pasado desde la pasada anterior, contado a cada uno:
 * - avisos agrupados a quien lleva al golfista (eagle, hoyo en uno, racha, ronda limpia)
 * - en el Vestuario de cada liga: cierre de equipos, momentos grandes, cambios de líder y ganador
 * El estado de cada liga queda en leagues/{id}.live para no repetir mensajes. Devuelve los avisos enviados.
 */
async function liveEvents(db, { tournament, teams, fieldPlayers, storedPlayers, messenger, now }) {
  let delivered = 0
  const moments = tournament.status === 'scheduled' ? [] : detectMoments(storedPlayers, fieldPlayers)
  const owners = new Map()
  for (const t of teams) for (const id of t.playerIds) owners.set(id, [...(owners.get(id) ?? []), t.uid])

  // Avisos al móvil: uno por usuario y pasada, con todos sus momentos
  const byUser = new Map()
  for (const m of moments) for (const uid of owners.get(m.playerId) ?? []) byUser.set(uid, [...(byUser.get(uid) ?? []), m])
  if (messenger && byUser.size) {
    delivered += await notify(db, messenger, { uids: [...byUser.keys()], messages: (uid) => ({ ...momentsMessage(byUser.get(uid)), path: '/dashboard' }) })
  }

  const teamByUid = new Map(teams.map((t) => [t.uid, t]))
  const leaguesSnap = await db.collection('leagues').get()
  for (const leagueDoc of leaguesSnap.docs) {
    const league = leagueDoc.data()
    const memberTeams = league.memberIds.map((uid) => teamByUid.get(uid)).filter(Boolean)
    if (!memberTeams.length) continue
    const live = league.live?.tournamentId === tournament.id ? league.live : null
    const name = (uid) => firstName(teamByUid.get(uid)?.displayName)
    const lines = []

    if (!live) {
      const chips = memberTeams.filter((t) => t.chip).map((t) => `${firstName(t.displayName)} activa ${CHIPS[t.chip].name}`)
      lines.push(`🔒 Equipos cerrados para el ${tournament.name}: ${memberTeams.length} en juego.${chips.length ? ` ${chips.join(' · ')}.` : ''}`)
    }
    for (const m of moments.filter(isBigMoment)) {
      const who = (owners.get(m.playerId) ?? []).filter((uid) => league.memberIds.includes(uid))
      if (who.length) lines.push(`${momentText(m)} · ${who.length === 1 ? 'lo lleva' : 'lo llevan'} ${joinNames(who.map(name))}`)
    }

    const lead = leaders(memberTeams)
    const leadPoints = formatPoints(teamByUid.get(lead[0])?.points ?? 0)
    const leaderChanged = live && tournament.status === 'in_progress' && memberTeams.length > 1 && (live.leaders ?? []).join() !== lead.join()
    if (leaderChanged) {
      lines.push(`👑 ${joinNames(lead.map(name))} ${lead.length > 1 ? 'comparten el liderato' : 'pasa a liderar'} con ${leadPoints} puntos`)
      if (messenger) {
        delivered += await notify(db, messenger, {
          uids: league.memberIds,
          messages: (uid) => ({
            title: lead.includes(uid) ? `¡Lideras ${league.name}!` : `${joinNames(lead.map(name))} lidera ${league.name}`,
            body: `${tournament.name}: ${leadPoints} puntos. Mira la clasificación.`,
            path: `/league/${leagueDoc.id}`,
          }),
        })
      }
    }
    const announceWinner = tournament.status === 'final' && !live?.finalPosted
    if (announceWinner) lines.push(`🏆 ${joinNames(lead.map(name))} ${lead.length > 1 ? 'ganan' : 'gana'} el ${tournament.name} en la liga con ${leadPoints} puntos`)

    if (lines.length) {
      const batch = db.batch()
      lines.forEach((text, i) => {
        batch.set(leagueDoc.ref.collection('messages').doc(), {
          uid: 'system', displayName: 'Fantasy Golf ES', color: null, text, kind: 'system',
          // Un milisegundo de diferencia para que salgan en orden
          createdAt: Timestamp.fromMillis(now.getTime() + i),
        })
      })
      await batch.commit()
    }
    await leagueDoc.ref.set({ live: { tournamentId: tournament.id, leaders: lead, finalPosted: Boolean(announceWinner || live?.finalPosted) } }, { merge: true })
  }
  return delivered
}

/** Estadísticas del equipo en el torneo, para los logros: birdies, eagles, corte y acierto del capitán. */
export function teamStats(playerIds, captainId, fieldById, tournament) {
  const team = playerIds.map((id) => fieldById.get(id)).filter(Boolean)
  const sum = (key) => team.reduce((s, p) => s + (p.holes?.[key] ?? 0), 0)
  const cutDone = tournament.cutRound > 0 && (tournament.status === 'final' || tournament.round > tournament.cutRound)
  const best = Math.max(...team.map((p) => p.points ?? 0))
  return {
    birdies: sum('birdies'),
    eagles: sum('eagles') + sum('albatross'),
    allMadeCut: cutDone && team.length === playerIds.length && team.every((p) => !isEliminated(p.status)),
    captainTop: (fieldById.get(captainId)?.points ?? -Infinity) >= best,
  }
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
