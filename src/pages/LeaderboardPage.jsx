import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, usePlayers } from '../hooks/useTournament'
import { useEntries, useSeasonStandings, withRanks } from '../hooks/useLeagueData'
import { clubColor } from '../lib/clubs'
import { formatPrice, formatToPar, golfScoreClass } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import PlayerPhoto from '../components/ui/PlayerPhoto'
import Points from '../components/ui/Points'
import StandingsList from '../components/ui/StandingsList'
import Tabs from '../components/ui/Tabs'
import TeamList from '../components/ui/TeamList'
import WeekStats from '../components/ui/WeekStats'
import { OadStandings } from '../components/ui/OneAndDone'
import { useOadResults } from '../hooks/useOneAndDone'

const VIEWS = [
  { id: 'tournament', label: 'Torneo' },
  { id: 'season', label: 'Temporada' },
  { id: 'golfers', label: 'Golfistas' },
  { id: 'oad', label: 'Sin repetir' },
]

// Golfistas del torneo ordenados por los puntos de fantasy que dan
function Golfers({ players, tournament }) {
  if (!players) return <Skeleton className="h-16" count={6} />
  if (!players.length) return <div className="card"><EmptyState title="La lista de inscritos todavía no está publicada." /></div>
  const started = tournament.status !== 'scheduled'
  const sorted = [...players].sort(started ? (a, b) => b.points - a.points : (a, b) => b.price - a.price)
  return (
    <div className="card px-4 pt-3 pb-1">
      <div className="grid grid-cols-[2.6rem_minmax(0,1fr)_2.8rem_3.4rem] pb-1.5 label">
        <span>Pos</span><span>Jugador</span><span className="text-center">Tot</span><span className="text-right">{started ? 'Pts' : 'Precio'}</span>
      </div>
      <ol>
        {sorted.map((p) => (
          <li key={p.id}>
            <Link to={`/jugador/${tournament.id}/${p.id}`} className="grid min-h-[3.9rem] grid-cols-[2.6rem_minmax(0,1fr)_2.8rem_3.4rem] items-center border-t border-line transition-colors hover:bg-bg/60">
              <span className="score text-[1.45rem] text-pine">{started ? p.positionDisplay : ''}</span>
              <span className="flex min-w-0 items-center gap-2.5">
                <PlayerPhoto src={p.photoURL} name={p.name} />
                <span className="min-w-0">
                  <span className="block truncate text-[0.95rem] font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {formatPrice(p.price)}{started && p.holes ? ` · ${p.holes.birdies} birdies${p.holes.eagles ? ` · ${p.holes.eagles} eagles` : ''}` : p.owgr ? ` · OWGR #${p.owgr}` : ''}
                  </span>
                </span>
              </span>
              <span className={`text-center text-sm ${golfScoreClass(p.toPar)}`}>{started ? formatToPar(p.toPar) : ''}</span>
              <span className="text-right">{started ? <Points value={p.points} className="text-[1.6rem]" /> : <span className="score text-[1.3rem] text-pine">{formatPrice(p.price)}</span>}</span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [view, setView] = useState('tournament')
  const tournament = useCurrentTournament()
  const entries = useEntries(tournament?.id)
  const season = useSeasonStandings(tournament?.season)
  const { players, byId } = usePlayers(tournament?.id)
  const oadResults = useOadResults(tournament?.season)

  const tournamentRows = useMemo(() => entries && withRanks(entries).map((e) => ({ ...e, photo: byId[e.captainId]?.photoURL })), [entries, byId])
  const seasonRows = useMemo(() => season && [...season].sort((a, b) => a.rank - b.rank), [season])
  const rows = view === 'tournament' ? tournamentRows : seasonRows

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <PageHeader eyebrow={tournament ? tournament.name : 'Fantasy Golf ES'} title="Ranking" subtitle="Todos los jugadores de Fantasy Golf ES" />
      <Tabs tabs={VIEWS} value={view} onChange={setView} className="mb-5" />

      {tournament === undefined ? (
        <Skeleton className="h-44 rounded-[1.6rem]" count={3} />
      ) : !tournament ? (
        <div className="card"><EmptyState title="Todavía no hay torneo esta semana." /></div>
      ) : view === 'oad' ? (
        <OadStandings results={oadResults} currentUid={user?.uid} />
      ) : view === 'golfers' ? (
        <>
          {tournament.status !== 'scheduled' && <div className="-mt-1 mb-5"><WeekStats players={players} entries={entries} tournamentId={tournament.id} scopeLabel="Fantasy Golf ES" /></div>}
          <Golfers players={players} tournament={tournament} />
        </>
      ) : !rows ? (
        <Skeleton className="h-44 rounded-[1.6rem]" count={3} />
      ) : rows.length === 0 ? (
        <div className="card"><EmptyState title={view === 'tournament' ? 'Los equipos aparecen aquí cuando empieza el torneo.' : 'La clasificación de la temporada aparece al terminar el primer torneo.'} /></div>
      ) : (
        <StandingsList
          rows={rows}
          currentUid={user?.uid}
          renderDetail={view === 'tournament' ? (s) => <TeamList playerIds={s.playerIds} captainId={s.captainId} substitutions={s.substitutions} chip={s.chip} playersById={byId} clubBg={clubColor(s.color, s.uid).bg} tournamentId={tournament.id} /> : undefined}
          meta={view === 'season' ? (s) => `${s.tournaments} ${s.tournaments === 1 ? 'torneo' : 'torneos'}${s.wins ? ` · ${s.wins} ${s.wins === 1 ? 'victoria' : 'victorias'}` : ''}` : undefined}
        />
      )}
    </div>
  )
}
