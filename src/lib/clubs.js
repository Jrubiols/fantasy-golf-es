// Colores de club: cada jugador elige uno y su tarjeta, avatar y capitán se pintan con él.
// Los ids son los que guarda Firestore (las reglas solo aceptan estos).
export const CLUB_COLORS = [
  { id: 'pino', name: 'Pino', bg: '#0a4a24', ring: '#0f5c2f' },
  { id: 'granate', name: 'Granate', bg: '#7a0f2e', ring: '#6a0b27' },
  { id: 'marino', name: 'Marino', bg: '#1e2a44', ring: '#18233a' },
  { id: 'laguna', name: 'Laguna', bg: '#00504a', ring: '#00443f' },
  { id: 'teja', name: 'Teja', bg: '#a3401a', ring: '#8e3615' },
  { id: 'violeta', name: 'Violeta', bg: '#4b2a7b', ring: '#3f2268' },
  { id: 'azul', name: 'Azul', bg: '#0b4fa8', ring: '#0a4492' },
  { id: 'carbon', name: 'Carbón', bg: '#2a2d2a', ring: '#222522' },
]

export const CLUB_COLOR_IDS = CLUB_COLORS.map((c) => c.id)

const byId = Object.fromEntries(CLUB_COLORS.map((c) => [c.id, c]))

/** Color de un jugador: el que eligió o, si no eligió, uno fijo a partir de su uid. */
export function clubColor(color, uid = '') {
  if (byId[color]) return byId[color]
  let hash = 0
  for (const ch of uid) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return CLUB_COLORS[hash % CLUB_COLORS.length]
}
