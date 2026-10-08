import { CAPTAIN_MULTIPLIER } from '../../lib/scoring'
import { formatToPar, golfScoreClass } from '../../utils/format'
import Avatar from './Avatar'
import Points from './Points'

// En la primera ronda el resultado de hoy es el total: no se repite
const showToday = (p) => p.today && p.status === 'active' && (p.rounds?.length ?? 0) + (p.thru > 0 && p.thru < 18 ? 1 : 0) > 1

// Los 6 jugadores de un equipo con su situación en el torneo y sus puntos (el capitán, multiplicados)
export default function TeamList({ playerIds, captainId, playersById, showPoints = true }) {
  const rows = playerIds
    .map((id) => playersById[id] ?? { id, name: 'Jugador retirado del torneo' })
    .map((p) => ({ ...p, isCaptain: p.id === captainId, teamPoints: (p.points ?? 0) * (p.id === captainId ? CAPTAIN_MULTIPLIER : 1) }))
    .sort((a, b) => b.teamPoints - a.teamPoints)

  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((p) => (
        <li key={p.id} className={`list-row ${p.isCaptain ? 'list-row-highlight' : ''}`}>
          <span className="min-w-8 text-center font-mono text-xs text-muted">{p.positionDisplay ?? '-'}</span>
          <Avatar src={p.photoURL} name={p.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <span className="truncate">{p.name}</span>
              {p.isCaptain && <span className="shrink-0 rounded bg-gold-500 px-1 text-[0.65rem] font-bold text-pine-950" title={`Capitán: puntos x${CAPTAIN_MULTIPLIER}`}>C</span>}
            </p>
            <p className="text-xs text-muted">
              <span className={golfScoreClass(p.toPar)}>{formatToPar(p.toPar)}</span>
              {p.status === 'active' && p.thru > 0 && p.thru < 18 ? ` · hoyo ${p.thru}` : ''}
              {showToday(p) ? ` · hoy ${p.today}` : ''}
            </p>
          </div>
          {showPoints && <Points value={p.teamPoints} className="min-w-12 text-right text-sm" />}
        </li>
      ))}
    </ul>
  )
}
