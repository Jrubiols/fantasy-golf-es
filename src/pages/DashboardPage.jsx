import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, useLocked, usePlayers } from '../hooks/useTournament'
import { useSeasonStandings } from '../hooks/useLeagueData'
import { getMyPicks, subscribeMyEntries, subscribeMyLeagues } from '../services/firestoreService'
import { firstName } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Points from '../components/ui/Points'
import TeamList from '../components/ui/TeamList'
import TournamentCard from '../components/ui/TournamentCard'

function Stat({ label, children }) {
  return (
    <div className="rounded-lg bg-white/4 px-3 py-2.5 text-center">
      <p className="font-mono text-lg font-bold text-cream">{children}</p>
      <p className="text-[0.7rem] text-muted uppercase">{label}</p>
    </div>
  )
}

function MyTeam({ tournament, user, entry }) {
  const { locked } = useLocked(tournament)
  const { byId } = usePlayers(tournament.id)
  const [picks, setPicks] = useState(undefined)

  useEffect(() => {
    getMyPicks(tournament.id, user.uid).then(setPicks).catch(() => setPicks(null))
  }, [tournament.id, user.uid])

  return (
    <section className="card animate-fade-up p-5 [animation-delay:100ms]">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Mi equipo</h3>
        {entry && (
          <div className="text-right">
            <Points value={entry.points} suffix=" pts" className="text-lg" />
            <p className="text-xs text-muted">{entry.rank}º de {entry.teamCount}</p>
          </div>
        )}
      </div>
      {picks === undefined ? (
        <Skeleton count={3} />
      ) : !picks ? (
        locked
          ? <EmptyState title="No hiciste equipo para este torneo." />
          : <EmptyState title="Aún no has hecho tu equipo" action={<Link to="/draft" className="btn-primary">Elegir jugadores ⛳</Link>} />
      ) : (
        <>
          <TeamList playerIds={picks.playerIds} captainId={picks.captainId} playersById={byId} showPoints={locked} />
          {!locked && <Link to="/draft" className="btn-secondary mt-4 w-full">Cambiar equipo</Link>}
        </>
      )}
    </section>
  )
}

function MyLeagues({ user, season, liveEntry }) {
  const [leagues, setLeagues] = useState(null)
  const standings = useSeasonStandings(season)
  const me = useMemo(() => standings?.find((s) => s.uid === user.uid), [standings, user.uid])
  // Los torneos cerrados más el que está en juego
  const livePoints = Math.round(((me?.points ?? 0) + (liveEntry && !liveEntry.final ? liveEntry.points : 0)) * 10) / 10

  useEffect(() => subscribeMyLeagues(user.uid, setLeagues, (err) => { console.error(err); setLeagues([]) }), [user.uid])

  return (
    <section className="card animate-fade-up p-5 [animation-delay:150ms]">
      <h3 className="mb-4 font-semibold">Mi temporada</h3>
      <div className="mb-5 grid grid-cols-3 gap-2">
        <Stat label="Puesto">{me ? `${me.rank}º` : '–'}</Stat>
        <Stat label="Puntos">{livePoints}</Stat>
        <Stat label="Victorias">{me?.wins ?? 0}</Stat>
      </div>
      <h3 className="mb-3 font-semibold">Mis ligas</h3>
      {leagues === null ? (
        <Skeleton className="h-14" count={2} />
      ) : leagues.length === 0 ? (
        <EmptyState title="No estás en ninguna liga todavía" action={<Link to="/league" className="btn-primary w-full">Crear o unirse a una liga</Link>} />
      ) : (
        <ul className="flex flex-col gap-2">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link to={`/league/${l.id}`} className="list-row justify-between hover:bg-white/7">
                <span className="font-medium text-gold-500">{l.name}</span>
                <span className="text-xs text-muted">{l.memberIds.length} participantes →</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const tournament = useCurrentTournament()
  const [entries, setEntries] = useState([])
  useEffect(() => subscribeMyEntries(user.uid, setEntries, console.error), [user.uid])
  const entry = tournament && entries.find((e) => e.tournamentId === tournament.id)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader eyebrow="Bienvenido de nuevo" title={firstName(user?.displayName)} />

      {tournament === undefined ? (
        <Skeleton className="h-32 rounded-xl" />
      ) : !tournament ? (
        <div className="card p-5"><EmptyState title="Todavía no hay torneo esta semana. Vuelve en unos días." /></div>
      ) : (
        <TournamentCard tournament={tournament} />
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {tournament ? <MyTeam tournament={tournament} user={user} entry={entry} /> : <div />}
        <MyLeagues user={user} season={tournament?.season ?? new Date().getFullYear()} liveEntry={entry} />
      </div>
    </div>
  )
}
