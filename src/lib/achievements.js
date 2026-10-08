// Logros: se calculan a partir de los equipos publicados de un jugador (entries), que el motor
// completa con el puesto, los puntos y unas estadísticas (stats) del equipo en cada torneo.

const finished = (entries) => entries.filter((e) => e.final)

export const ACHIEVEMENTS = [
  { id: 'debut', icon: 'flag', name: 'Debut', description: 'Juega tu primer torneo', test: (es) => es.find((e) => e.final) },
  { id: 'podium', icon: 'ranking', name: 'Podio', description: 'Termina entre los 3 primeros de un torneo', test: (es) => finished(es).find((e) => e.rank <= 3) },
  { id: 'champion', icon: 'league', name: 'Campeón', description: 'Gana un torneo', test: (es) => finished(es).find((e) => e.rank === 1) },
  { id: 'hattrick', icon: 'league', name: 'Triplete', description: 'Gana 3 torneos', test: (es) => finished(es).filter((e) => e.rank === 1)[2] },
  { id: 'captain', icon: 'check', name: 'Ojo de capitán', description: 'Tu capitán es el que más puntúa de tu equipo', test: (es) => finished(es).find((e) => e.stats?.captainTop) },
  { id: 'cut', icon: 'team', name: 'Pleno al corte', description: 'Todo tu equipo pasa el corte', test: (es) => finished(es).find((e) => e.stats?.allMadeCut) },
  { id: 'birdies', icon: 'plus', name: 'Lluvia de birdies', description: 'Tu equipo suma 60 birdies en un torneo', test: (es) => finished(es).find((e) => (e.stats?.birdies ?? 0) >= 60) },
  { id: 'eagles', icon: 'arrow', name: 'Cazador de eagles', description: 'Tu equipo hace 3 eagles en un torneo', test: (es) => finished(es).find((e) => (e.stats?.eagles ?? 0) >= 3) },
  { id: 'century', icon: 'ranking', name: 'Trescientos', description: 'Haz 300 puntos en un torneo', test: (es) => finished(es).find((e) => e.points >= 300) },
  { id: 'regular', icon: 'history', name: 'Fijo', description: 'Juega 10 torneos', test: (es) => finished(es)[9] },
]

/**
 * Estado de cada logro: { ...logro, earned, entry } donde `entry` es el torneo en que se consiguió.
 * Las entradas se ordenan por fecha para que el logro quede en el primer torneo que lo cumplió.
 */
export function achievementsFor(entries) {
  const sorted = [...entries].sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
  return ACHIEVEMENTS.map(({ test, ...a }) => {
    const entry = test(sorted) ?? null
    return { ...a, earned: Boolean(entry), entry }
  })
}
