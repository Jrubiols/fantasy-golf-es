import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { bestValue, idealTeam } from '../../lib/ideal'
import { formatPrice } from '../../utils/format'
import PlayerPhoto from './PlayerPhoto'
import Points from './Points'

/**
 * Datos de la semana: equipo ideal (lo máximo posible con 100M), mejores compras y los
 * golfistas más elegidos por los equipos de `entries` (los de una liga o los de todos).
 */
export default function WeekStats({ players, entries, tournamentId, scopeLabel = 'la liga' }) {
  const byId = useMemo(() => Object.fromEntries((players ?? []).map((p) => [p.id, p])), [players])
  const ideal = useMemo(() => (players?.length ? idealTeam(players) : null), [players])
  const values = useMemo(() => bestValue(players ?? []), [players])
  const popular = useMemo(() => {
    const counts = new Map()
    const captains = new Map()
    for (const e of entries ?? []) {
      for (const id of e.playerIds) counts.set(id, (counts.get(id) ?? 0) + 1)
      captains.set(e.captainId, (captains.get(e.captainId) ?? 0) + 1)
    }
    const top = (map) => [...map].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => ({ player: byId[id], n })).filter((x) => x.player)
    return { picks: top(counts), captains: top(captains) }
  }, [entries, byId])

  if (!ideal) return null
  const best = Math.max(0, ...(entries ?? []).map((e) => e.points))
  const teams = entries?.length ?? 0

  return (
    <section className="mt-6 flex flex-col gap-4">
      <h2 className="headline px-1 text-[2rem]">Datos de la semana</h2>

      {/* Equipo ideal */}
      <div className="relative overflow-hidden rounded-[1.6rem] bg-pine p-5 text-white">
        <div className="halftone absolute inset-0" />
        <div className="relative flex items-end justify-between">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-mint uppercase">Equipo ideal · {formatPrice(ideal.cost)}</p>
            <p className="score mt-1 text-[2.8rem]">{ideal.points}<span className="ml-1 text-xl text-white/60">pts</span></p>
          </div>
          {teams > 0 && <p className="mb-1 max-w-[45%] text-right text-xs text-white/75">El mejor de {scopeLabel} lleva {best} ({Math.round((best / ideal.points) * 100)} % del ideal)</p>}
        </div>
        <ol className="relative mt-4 grid grid-cols-6 gap-2">
          {ideal.playerIds.map((id) => (
            <li key={id} className="relative">
              <Link to={`/jugador/${tournamentId}/${id}`} className="block aspect-square overflow-hidden rounded-full" title={byId[id]?.name}>
                <PlayerPhoto src={byId[id]?.photoURL} name={byId[id]?.name} bg={id === ideal.captainId ? '#7a0f2e' : '#11663a'} className="!size-full" />
              </Link>
              {id === ideal.captainId && <span className="absolute -top-1 -right-1 flex h-5 items-center rounded-full bg-mint px-1.5 text-[0.65rem] font-bold text-pine-dark">C</span>}
            </li>
          ))}
        </ol>
        <p className="relative mt-2 truncate text-xs text-white/70">{ideal.playerIds.map((id) => byId[id]?.shortName).join(' · ')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Mejor compra */}
        <div className="card p-4">
          <p className="label mb-1">Mejor compra · puntos por millón</p>
          {values.map((p) => (
            <Link key={p.id} to={`/jugador/${tournamentId}/${p.id}`} className="row">
              <PlayerPhoto src={p.photoURL} name={p.name} size="sm" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.name}</span><span className="text-xs text-muted">{formatPrice(p.price)} · {p.points} pts</span></span>
              <span className="score text-xl text-pine">{String(p.perMillion).replace('.', ',')}</span>
            </Link>
          ))}
        </div>

        {/* Más elegidos */}
        <div className="card p-4">
          <p className="label mb-1">Los más elegidos en {scopeLabel}</p>
          {!popular.picks.length && <p className="py-3 text-sm text-muted">Aún no hay equipos publicados.</p>}
          {popular.picks.map(({ player, n }) => (
            <Link key={player.id} to={`/jugador/${tournamentId}/${player.id}`} className="row">
              <PlayerPhoto src={player.photoURL} name={player.name} size="sm" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{player.name}</span><span className="text-xs text-muted">en {n} de {teams} equipos</span></span>
              <Points value={player.points ?? 0} className="text-xl" />
            </Link>
          ))}
          {popular.captains[0] && (
            <p className="mt-2 text-xs text-muted">Capitán favorito: <strong className="text-pine">{popular.captains[0].player.name}</strong> ({popular.captains[0].n} de {teams})</p>
          )}
        </div>
      </div>
    </section>
  )
}
