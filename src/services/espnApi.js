const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/golf'

export const TOURS = { PGA: 'pga', DPWORLD: 'dpworld', MASTERS: 'masters' }

export async function fetchTournamentScoreboard(tour = TOURS.PGA) {
  const res = await fetch(`${ESPN_BASE}/${tour}/scoreboard`)
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`)
  return res.json()
}

export function parseLeaderboard(espnData) {
  try {
    const competitors = espnData?.events?.[0]?.competitions?.[0]?.competitors || []
    return competitors.map((c) => {
      const athlete = c.athlete || {}
      return {
        id: athlete.id,
        name: athlete.displayName || athlete.fullName,
        shortName: athlete.shortName,
        country: athlete.flag?.alt || '',
        photoURL: athlete.headshot?.href || null,
        position: parsePosition(c.status?.position?.displayName),
        positionDisplay: c.status?.position?.displayName || '-',
        totalScore: c.score?.displayValue || 'E',
        totalScoreValue: parseInt(c.score?.value) || 0,
        status: c.status?.type?.name || 'active',
        cutMade: c.status?.type?.name !== 'cut',
        birdies: extractStat(c.statistics, 'birdies'),
        eagles: extractStat(c.statistics, 'eagles'),
        bogeys: extractStat(c.statistics, 'bogeys'),
        doubleBogeys: extractStat(c.statistics, 'doubleBogeys'),
        pars: extractStat(c.statistics, 'pars'),
      }
    })
  } catch (err) {
    console.error('Error parsing ESPN leaderboard:', err)
    return []
  }
}

function parsePosition(displayPos) {
  if (!displayPos) return 999
  if (displayPos === 'MC' || displayPos === 'CUT') return 999
  if (displayPos === 'WD') return 998
  const n = parseInt(displayPos.replace('T', '').replace('=', ''))
  return isNaN(n) ? 999 : n
}

function extractStat(statistics, statName) {
  if (!statistics) return 0
  const stat = statistics.find((s) => s.name?.toLowerCase().includes(statName.toLowerCase()))
  return stat ? parseInt(stat.displayValue) || 0 : 0
}

export function parseActiveTournament(espnData) {
  const event = espnData?.events?.[0]
  if (!event) return null
  return {
    id: event.id,
    name: event.name,
    shortName: event.shortName,
    date: event.date,
    status: event.status?.type?.name,
    statusDisplay: event.status?.type?.detail,
    round: event.status?.period,
    venue: event.competitions?.[0]?.venue?.fullName,
    city: event.competitions?.[0]?.venue?.address?.city,
    country: event.competitions?.[0]?.venue?.address?.country,
  }
}
