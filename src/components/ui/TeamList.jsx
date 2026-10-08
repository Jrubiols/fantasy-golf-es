import { Link } from 'react-router-dom'
import { CAPTAIN_MULTIPLIER } from '../../lib/scoring'
import { formatToPar, golfScoreClass } from '../../utils/format'
import PlayerPhoto from './PlayerPhoto'
import Points from './Points'

// En la primera ronda el resultado de hoy es el total: no se repite
const showToday = (p) => p.today && p.status === 'active' && (p.rounds?.length ?? 0) + (p.thru > 0 && p.thru < 18 ? 1 : 0) > 1

/**
 * Los 6 jugadores de un equipo, como una clasificación: puesto, foto, resultado y puntos
 * (el capitán multiplicado y pintado con el color del club). Cada fila lleva a la ficha del jugador.
 */
export default function TeamList({ playerIds, captainId, playersById, showPoints = true, clubBg = '#0a4a24', tournamentId, substitutions = [] }) {
  const replaced = Object.fromEntries(substitutions.map((s) => [s.in, playersById[s.out]?.shortName ?? 'un retirado']))
  const rows = playerIds
    .map((id) => playersById[id] ?? { id, name: 'Jugador retirado del torneo' })
    .map((p) => ({ ...p, isCaptain: p.id === captainId, teamPoints: (p.points ?? 0) * (p.id === captainId ? CAPTAIN_MULTIPLIER : 1) }))
    .sort((a, b) => b.teamPoints - a.teamPoints)

  return (
    <div>
      <div className="grid grid-cols-[2.6rem_minmax(0,1fr)_2.8rem_3.4rem] pb-1.5 label">
        <span>Pos</span><span>Jugador</span><span className="text-center">Tot</span><span className="text-right">{showPoints ? 'Pts' : ''}</span>
      </div>
      <ul>
        {rows.map((p) => {
          const content = (
            <>
              <span className="score text-[1.45rem] text-pine">{p.positionDisplay ?? '-'}</span>
              <span className="flex min-w-0 items-center gap-2.5">
                <PlayerPhoto src={p.photoURL} name={p.name} bg={p.isCaptain ? clubBg : '#0a4a24'} />
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-[0.95rem] font-medium">{p.shortName ?? p.name}</span>
                    {p.isCaptain && (
                      <span className="inline-flex h-5 shrink-0 items-center rounded-full px-1.5 text-[0.68rem] font-bold text-white" style={{ background: clubBg }} title={`Capitán: puntos x${CAPTAIN_MULTIPLIER}`}>C</span>
                    )}
                  </span>
                  {replaced[p.id] ? (
                    <span className="block text-xs font-medium text-under">Entra por {replaced[p.id]} (retirado)</span>
                  ) : (p.status === 'active' && p.thru > 0 && p.thru < 18) || showToday(p) ? (
                    <span className="block text-xs text-muted">
                      {p.thru > 0 && p.thru < 18 ? `Hoyo ${p.thru}` : ''}{showToday(p) ? `${p.thru > 0 && p.thru < 18 ? ' · ' : ''}hoy ${p.today}` : ''}
                    </span>
                  ) : p.status !== 'active' && p.status !== 'finished' ? (
                    <span className="block text-xs text-over">{p.status === 'cut' ? 'No pasó el corte' : 'Retirado'}</span>
                  ) : null}
                </span>
              </span>
              <span className={`text-center text-sm ${golfScoreClass(p.toPar)}`}>{formatToPar(p.toPar)}</span>
              <span className="text-right">{showPoints && <Points value={p.teamPoints} className="text-[1.6rem]" />}</span>
            </>
          )
          const cls = 'grid min-h-[3.9rem] grid-cols-[2.6rem_minmax(0,1fr)_2.8rem_3.4rem] items-center border-t border-line'
          return (
            <li key={p.id}>
              {tournamentId && playersById[p.id]
                ? <Link to={`/jugador/${tournamentId}/${p.id}`} className={`${cls} transition-colors hover:bg-bg/60`}>{content}</Link>
                : <div className={cls}>{content}</div>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
