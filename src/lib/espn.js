// Lector de los datos de golf de ESPN. Sin dependencias: lo usan la web y el motor (Node 18+).
//
// ESPN tiene dos fuentes que se complementan:
// - leaderboard: posición, estado (corte, retirado), hoyos jugados, foto y par de cada hoyo.
// - scoreboard: golpes hoyo a hoyo, pero solo del torneo de esta semana.

const LEADERBOARD_URL = 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard'
const SCOREBOARD_URL = 'https://site.api.espn.com/apis/site/v2/sports/golf'

export const TOUR = 'pga'

async function getJson(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`ESPN respondió ${res.status} en ${url}`)
  return res.json()
}

export function fetchLeaderboard(eventId, tour = TOUR) {
  const params = new URLSearchParams({ league: tour })
  if (eventId) params.set('event', eventId)
  return getJson(`${LEADERBOARD_URL}?${params}`)
}

export function fetchScoreboard(tour = TOUR) {
  return getJson(`${SCOREBOARD_URL}/${tour}/scoreboard`)
}

/** Calendario de la temporada: [{ id, name, startDate, endDate }] */
export function parseCalendar(scoreboard) {
  const calendar = scoreboard?.leagues?.[0]?.calendar ?? []
  return calendar.map((e) => ({ id: e.id, name: e.label, startDate: e.startDate, endDate: e.endDate }))
}

const STATE = { pre: 'scheduled', in: 'in_progress', post: 'final' }

/** Datos generales del torneo a partir del leaderboard. */
export function parseTournament(leaderboard) {
  const event = leaderboard?.events?.[0]
  if (!event) return null
  const competition = event.competitions?.[0] ?? {}
  const course = event.courses?.find((c) => c.host) ?? event.courses?.[0]
  // El estado del torneo va en el evento; el de la competición es el de la ronda ("Round 1 - Play Complete")
  const roundStatus = competition.status ?? {}
  const eventState = event.status?.type?.state ?? roundStatus.type?.state
  const teeTimes = (competition.competitors ?? [])
    .map((c) => c.linescores?.[0]?.teeTime ?? (c.status?.period === 1 ? c.status?.teeTime : null))
    .filter(Boolean)
    .sort()

  return {
    id: event.id,
    name: event.name,
    shortName: event.shortName ?? event.name,
    tour: event.league?.abbreviation?.toLowerCase() ?? TOUR,
    season: event.season?.year ?? new Date(event.date).getFullYear(),
    startDate: event.date,
    endDate: event.endDate,
    // Los equipos se cierran con la primera salida del torneo
    firstTeeTime: teeTimes[0] ?? event.date,
    status: STATE[eventState] ?? 'scheduled',
    statusDetail: roundStatus.type?.detail ?? event.status?.type?.description ?? '',
    round: roundStatus.period ?? 0,
    rounds: event.tournament?.numberOfRounds ?? 4,
    cutRound: event.tournament?.cutRound ?? 0,
    cutCount: event.tournament?.cutCount ?? 0,
    major: Boolean(event.tournament?.major),
    purse: event.displayPurse ?? null,
    venue: course?.name ?? '',
    par: course?.shotsToPar ?? 72,
    holePars: Object.fromEntries((course?.holes ?? []).map((h) => [h.number, h.shotsToPar])),
    fieldSize: competition.competitors?.length ?? 0,
  }
}

// ESPN marca a los retirados y descalificados como STATUS_CUT; lo que los distingue es shortDetail
const PLAYER_STATUS = { CUT: 'cut', MC: 'cut', MDF: 'cut', WD: 'wd', DQ: 'dq', F: 'finished' }

function playerStatus(status) {
  const short = status.type?.shortDetail ?? status.displayValue
  if (PLAYER_STATUS[short]) return PLAYER_STATUS[short]
  if (status.type?.name === 'STATUS_CUT') return 'cut'
  if (status.type?.name === 'STATUS_FINISH') return 'finished'
  return 'active'
}

/** Fuera del torneo: ni posición ni puntos por posición */
export const isEliminated = (status) => status === 'cut' || status === 'wd' || status === 'dq'

/** "T13" → 13, "1" → 1; CUT/WD/"-" → null */
export function parsePosition(display) {
  const n = parseInt(String(display ?? '').replace(/^T/, ''), 10)
  return Number.isFinite(n) ? n : null
}

/** "-8" → -8, "E" → 0, "+2" → 2 */
export function parseToPar(display) {
  if (display == null || display === '' || display === '-' || display === '--') return null
  if (display === 'E') return 0
  const n = parseInt(display, 10)
  return Number.isFinite(n) ? n : null
}

/** Jugadores del leaderboard (sin golpes hoyo a hoyo). */
export function parsePlayers(leaderboard) {
  const competitors = leaderboard?.events?.[0]?.competitions?.[0]?.competitors ?? []
  return competitors.map((c) => {
    const athlete = c.athlete ?? {}
    const status = c.status ?? {}
    const position = status.position?.displayName
    const toPar = c.statistics?.find((s) => s.name === 'scoreToPar')
    const state = playerStatus(status)
    return {
      id: String(athlete.id ?? c.id),
      name: athlete.displayName ?? athlete.fullName ?? '',
      shortName: athlete.shortName ?? athlete.displayName ?? '',
      country: athlete.flag?.alt ?? '',
      flagURL: athlete.flag?.href ?? null,
      photoURL: athlete.headshot?.href ?? null,
      amateur: Boolean(c.amateur ?? athlete.amateur),
      status: state,
      position: isEliminated(state) ? null : parsePosition(position),
      positionDisplay: isEliminated(state) ? state.toUpperCase() : position && position !== '-' ? position : '-',
      toPar: toPar?.value ?? parseToPar(c.score?.displayValue),
      thru: status.thru ?? 0,
      today: status.todayDetail ?? null,
      teeTime: status.teeTime ?? null,
      // Las rondas no jugadas llegan con 0 golpes
      rounds: (c.linescores ?? []).filter((r) => r.value > 0).map((r) => r.value),
      earnings: c.earnings ?? 0,
    }
  })
}

/**
 * Cuenta el resultado de cada hoyo jugado, por jugador, a partir del scoreboard.
 * Devuelve { eventId, holes: { [playerId]: { albatross, eagles, birdies, pars, bogeys, doubles, played } } }.
 * El par de cada hoyo viene del leaderboard; si falta, se usa el que da ESPN en el propio hoyo.
 */
export function parseHoleStats(scoreboard, holePars = {}) {
  const event = scoreboard?.events?.[0]
  const competitors = event?.competitions?.[0]?.competitors ?? []
  const holes = {}
  for (const c of competitors) {
    const stats = { albatross: 0, eagles: 0, birdies: 0, pars: 0, bogeys: 0, doubles: 0, played: 0 }
    for (const round of c.linescores ?? []) {
      for (const hole of round.linescores ?? []) {
        const diff = holeToPar(hole, holePars[hole.period])
        if (diff == null) continue
        stats.played++
        if (diff <= -3) stats.albatross++
        else if (diff === -2) stats.eagles++
        else if (diff === -1) stats.birdies++
        else if (diff === 0) stats.pars++
        else if (diff === 1) stats.bogeys++
        else stats.doubles++
      }
    }
    holes[String(c.athlete?.id ?? c.id)] = stats
  }
  return { eventId: event?.id ?? null, holes }
}

function holeToPar(hole, par) {
  if (hole.value == null) return null
  if (par) return hole.value - par
  const type = hole.scoreType?.displayValue
  if (type === 'OTHER') return hole.value >= 6 ? 3 : -3
  return parseToPar(type)
}
