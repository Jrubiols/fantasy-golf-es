// Precio de cada jugador en un torneo, según el ranking mundial oficial (OWGR).
// El precio es relativo a los inscritos: el mejor del torneo siempre cuesta MAX_PRICE,
// así que cada semana hay que elegir entre estrellas y gangas.

export const OWGR_URL =
  'https://apiweb.owgr.com/api/owgr/rankings/getRankings?regionId=0&pageSize=1000&pageNumber=1&countryCode=&sortString=Rank+ASC'

export const MIN_PRICE = 4
export const MAX_PRICE = 25

/** "Ludvig Åberg" → "ludvig aberg" */
export function normalizeName(name) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ø/gi, 'o')
    .replace(/[^a-z0-9 ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

/** Ranking OWGR → { byName: Map(nombre → entrada), byLastName: Map(apellido → [entradas]) } */
export function parseOwgr(json) {
  const byName = new Map()
  const byLastName = new Map()
  for (const r of json?.rankingsList ?? []) {
    const first = normalizeName(r.player?.firstName)
    const last = normalizeName(r.player?.lastName)
    const entry = { rank: r.rank, average: r.pointsAverage ?? 0, first }
    byName.set(normalizeName(r.player?.fullName), entry)
    byName.set(`${first} ${last}`, entry)
    byLastName.set(last, [...(byLastName.get(last) ?? []), entry])
  }
  return { byName, byLastName }
}

// Nombres de ESPN que no se parecen al de OWGR (nombre de ESPN → nombre de OWGR)
const ALIASES = { 'kevin yu': 'chun an yu', 'mac meissner': 'mcclure meissner' }

/**
 * Busca a un jugador de ESPN en el ranking. ESPN usa apodos ("Cam Davis", "Zach Bauchou")
 * donde OWGR usa el nombre completo, así que si el nombre no coincide se busca por apellido
 * con la misma inicial ("cam" → "cameron"). Con iniciales intermedias ("Zach J. Johnson")
 * no se adivina: ESPN las usa precisamente para distinguir a jugadores con el mismo nombre.
 */
export function findRanking(name, ranking) {
  const normalized = normalizeName(name)
  const exact = ranking.byName.get(ALIASES[normalized] ?? normalized)
  if (exact) return exact
  const [first = '', ...rest] = normalized.split(' ')
  if (!first || !rest.length || rest.some((part) => part.length === 1)) return null
  const sameInitial = (ranking.byLastName.get(rest.join(' ')) ?? []).filter((c) => c.first[0] === first[0])
  return sameInitial.length === 1 ? sameInitial[0] : null
}

const roundHalf = (n) => Math.round(n * 2) / 2

/**
 * Asigna precio a cada jugador: { [playerId]: { price, owgr } }.
 * La raíz cuadrada suaviza la distancia entre el número 1 y el resto.
 */
export function priceField(players, ranking) {
  const withRank = players.map((p) => ({ id: p.id, ...(findRanking(p.name, ranking) ?? { rank: null, average: 0 }) }))
  const best = Math.max(...withRank.map((p) => p.average), 0.01)
  return Object.fromEntries(
    withRank.map((p) => [p.id, {
      owgr: p.rank,
      price: roundHalf(MIN_PRICE + (MAX_PRICE - MIN_PRICE) * Math.sqrt(p.average / best)),
    }]),
  )
}

// Forma reciente: puntuación de 0 a 1 por cada torneo terminado según el puesto final
function finishScore(position) {
  const n = parseInt(String(position).replace(/^T/, ''), 10)
  if (!Number.isFinite(n)) return 0 // corte, retirado
  if (n === 1) return 1
  if (n <= 5) return 0.8
  if (n <= 10) return 0.65
  if (n <= 25) return 0.4
  if (n <= 50) return 0.2
  return 0.1
}

/**
 * Ajuste de precio por forma: media de los últimos 4 torneos terminados, de −2M (fuera de forma)
 * a +3M (en racha), al medio millón. Un jugador "normal" (~0,3) no cambia.
 * Devuelve { adjustment, form: ['T3', 'T63', ...], trend: 'up' | 'down' | 'flat' }.
 */
export function formAdjustment(recent) {
  const last = recent.filter((r) => r.finished).slice(0, 4)
  if (!last.length) return { adjustment: 0, form: [], trend: 'flat' }
  const score = last.reduce((s, r) => s + finishScore(r.position), 0) / last.length
  const raw = score >= 0.3 ? ((score - 0.3) / 0.5) * 3 : ((score - 0.3) / 0.3) * 2
  const adjustment = Math.max(-2, Math.min(3, Math.round(raw * 2) / 2))
  return { adjustment, form: last.map((r) => r.position), trend: adjustment > 0 ? 'up' : adjustment < 0 ? 'down' : 'flat' }
}

/** Precio final: el del ranking más el ajuste por forma, siempre entre el mínimo y el máximo. */
export const withForm = (price, adjustment) => Math.max(MIN_PRICE, Math.min(MAX_PRICE, price + adjustment))
