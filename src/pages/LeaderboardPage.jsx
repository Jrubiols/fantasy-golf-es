import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, usePlayers } from '../hooks/useTournament'
import { useEntries, useSeasonStandings, withRanks } from '../hooks/useLeagueData'
import { firstName, formatPrice, formatSigned, formatToPar, golfScoreClass } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Avatar from '../components/ui/Avatar'
import Points from '../components/ui/Points'
import StandingsList from '../components/ui/StandingsList'
import Tabs from '../components/ui/Tabs'
import TeamList from '../components/ui/TeamList'

const VIEWS = [
  { id: 'tournament', label: 'Torneo' },
  { id: 'season', label: 'Temporada' },
  { id: 'golfers', label: 'Golfistas' },
]

// Orden visual del podio: 2º, 1º, 3º
const PODIUM = [
  { index: 1, medal: '🥈', height: 'h-20' },
  { index: 0, medal: '🥇', height: 'h-28', winner: true },
  { index: 2, medal: '🥉', height: 'h-14' },
]

function Podium({ rows }) {
  return (
    <div className="mb-6 flex animate-fade-up items-end justify-center gap-2 px-4 pt-2 [animation-delay:80ms]">
      {PODIUM.map(({ index, medal, height, winner }) => {
        const s = rows[index]
        return (
          <div key={s.uid} className={`flex flex-col items-center gap-1.5 ${winner ? 'flex-[1.2]' : 'flex-1'}`}>
            <Avatar src={s.photoURL} name={s.displayName} size={winner ? 'xl' : 'lg'} className={`border-2 ${winner ? 'border-gold-500' : 'border-white/20'}`} />
            <span className={winner ? 'text-xl' : 'text-base'}>{medal}</span>
            <p className="max-w-20 truncate text-center text-xs font-semibold">{firstName(s.displayName)}</p>
            <div className={`flex w-full items-center justify-center rounded-t-md ${height} ${winner ? 'bg-linear-135 from-gold-500 to-gold-300 text-pine-950' : 'bg-white/8'}`}>
              <span className="font-mono text-sm font-bold">{formatSigned(s.points)}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Golfistas del torneo ordenados por los puntos de fantasy que dan
function Golfers({ players, tournament }) {
  if (!players) return <Skeleton className="h-13" count={6} />
  if (!players.length) return <EmptyState title="La lista de inscritos todavía no está publicada." />
  const started = tournament.status !== 'scheduled'
  const sorted = [...players].sort(started ? (a, b) => b.points - a.points : (a, b) => b.price - a.price)
  return (
    <ol className="flex flex-col gap-1.5">
      {sorted.map((p) => (
        <li key={p.id} className="list-row">
          <span className="min-w-8 text-center font-mono text-xs text-muted">{started ? p.positionDisplay : ''}</span>
          <Avatar src={p.photoURL} name={p.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{p.name}</p>
            <p className="text-xs text-muted">
              {formatPrice(p.price)}
              {started && <> · <span className={golfScoreClass(p.toPar)}>{formatToPar(p.toPar)}</span></>}
              {started && p.holes && ` · ${p.holes.birdies} birdies${p.holes.eagles ? `, ${p.holes.eagles} eagles` : ''}`}
            </p>
          </div>
          {started && <Points value={p.points} className="text-sm" />}
        </li>
      ))}
    </ol>
  )
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [view, setView] = useState('tournament')
  const tournament = useCurrentTournament()
  const entries = useEntries(tournament?.id)
  const season = useSeasonStandings(tournament?.season)
  const { players, byId } = usePlayers(tournament?.id)

  const tournamentRows = useMemo(() => entries && withRanks(entries), [entries])
  const seasonRows = useMemo(() => season && [...season].sort((a, b) => a.rank - b.rank), [season])
  const rows = view === 'tournament' ? tournamentRows : seasonRows

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader title="Ranking" subtitle="Todos los jugadores de Fantasy Golf ES" />
      <Tabs tabs={VIEWS} value={view} onChange={setView} className="mb-5" />

      {tournament === undefined ? (
        <Skeleton className="h-13" count={5} />
      ) : !tournament ? (
        <div className="card"><EmptyState title="Todavía no hay torneo esta semana." /></div>
      ) : view === 'golfers' ? (
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">{tournament.name}</h2>
          <Golfers players={players} tournament={tournament} />
        </section>
      ) : (
        <>
          {rows?.length >= 3 && <Podium rows={rows} />}
          <section className="card animate-fade-up p-5 [animation-delay:150ms]">
            <h2 className="mb-4 font-semibold">{view === 'tournament' ? tournament.name : `Temporada ${tournament.season}`}</h2>
            {!rows ? (
              <Skeleton className="h-13" count={5} />
            ) : rows.length === 0 ? (
              <EmptyState title={view === 'tournament' ? 'Los equipos aparecen aquí cuando empieza el torneo.' : 'La clasificación de la temporada aparece al terminar el primer torneo.'} />
            ) : (
              <StandingsList
                rows={rows}
                currentUid={user?.uid}
                renderDetail={view === 'tournament' ? (s) => <TeamList playerIds={s.playerIds} captainId={s.captainId} playersById={byId} /> : undefined}
                meta={view === 'season' ? (s) => `${s.tournaments} ${s.tournaments === 1 ? 'torneo' : 'torneos'}${s.wins ? ` · ${s.wins} 🏆` : ''}` : undefined}
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}
