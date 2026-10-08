import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, useLocked, usePlayers } from '../hooks/useTournament'
import { useSeasonStandings } from '../hooks/useLeagueData'
import { getMyPicks, subscribeMyEntries, subscribeMyLeagues } from '../services/firestoreService'
import { clubColor } from '../lib/clubs'
import { formatCountdown, formatPrice } from '../utils/format'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import ClubCard from '../components/ui/ClubCard'
import Icon from '../components/ui/Icon'
import Ordinal from '../components/ui/Ordinal'
import TeamList from '../components/ui/TeamList'
import TournamentCard from '../components/ui/TournamentCard'

function Stat({ label, children }) {
  return (
    <div className="rounded-2xl bg-bg px-3 py-3 text-center">
      <p className="score text-[2rem] text-pine">{children}</p>
      <p className="label mt-1">{label}</p>
    </div>
  )
}

function MyTeam({ tournament, user, profile, entry }) {
  const { locked, lockAt, now } = useLocked(tournament)
  const { byId } = usePlayers(tournament.id)
  const [picks, setPicks] = useState(undefined)
  const club = clubColor(profile?.color, user.uid)

  useEffect(() => {
    getMyPicks(tournament.id, user.uid).then(setPicks).catch(() => setPicks(null))
  }, [tournament.id, user.uid])

  if (picks === undefined) return <Skeleton className="h-56 rounded-[1.6rem]" />

  if (!picks) {
    return (
      <ClubCard color={profile?.color} uid={user.uid} title={locked ? 'Sin equipo' : 'Haz tu equipo'} subtitle={locked ? 'Esta semana no juegas' : `Se cierra en ${formatCountdown(lockAt - now)}`}>
        {!locked && (
          <Link to="/draft" className="absolute bottom-4 left-4 inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 font-display text-lg font-extrabold uppercase" style={{ color: club.bg }}>
            Elegir jugadores <Icon name="arrow" className="size-4" />
          </Link>
        )}
      </ClubCard>
    )
  }

  const captain = byId[picks.captainId]
  return (
    <>
      <ClubCard
        color={profile?.color}
        uid={user.uid}
        rank={entry?.rank}
        title={profile?.clubName || profile?.displayName || user.displayName}
        subtitle={entry ? `${entry.rank}º de ${entry.teamCount} · capitán ${captain?.shortName ?? ''}` : `Capitán: ${captain?.shortName ?? '—'}`}
        photo={captain?.photoURL}
        points={locked ? entry?.points ?? 0 : picks.cost}
        pointsLabel={locked ? 'Puntos' : 'Coste'}
      />
      <section className="card mt-4 animate-fade-up px-4 pt-3 pb-1 [animation-delay:120ms]">
        <TeamList playerIds={picks.playerIds} captainId={picks.captainId} playersById={byId} showPoints={locked} clubBg={club.bg} tournamentId={tournament.id} />
        {!locked && (
          <Link to="/draft" className="btn-secondary my-3 w-full">Cambiar equipo · {formatPrice(100 - picks.cost)} libres</Link>
        )}
      </section>
    </>
  )
}

function MySeason({ user, season, liveEntry }) {
  const [leagues, setLeagues] = useState(null)
  const standings = useSeasonStandings(season)
  const me = useMemo(() => standings?.find((s) => s.uid === user.uid), [standings, user.uid])
  // Los torneos cerrados más el que está en juego
  const livePoints = Math.round(((me?.points ?? 0) + (liveEntry && !liveEntry.final ? liveEntry.points : 0)) * 10) / 10

  useEffect(() => subscribeMyLeagues(user.uid, setLeagues, (err) => { console.error(err); setLeagues([]) }), [user.uid])

  return (
    <section className="card animate-fade-up p-5 [animation-delay:180ms]">
      <p className="label">Temporada {season}</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Puesto"><Ordinal value={me?.rank} /></Stat>
        <Stat label="Puntos">{livePoints}</Stat>
        <Stat label="Victorias">{me?.wins ?? 0}</Stat>
      </div>
      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="headline text-[1.7rem]">Mis ligas</h2>
        <Link to="/league" className="text-sm font-semibold text-pine">Ver todas</Link>
      </div>
      {leagues === null ? (
        <Skeleton className="mt-3 h-14" count={2} />
      ) : leagues.length === 0 ? (
        <EmptyState title="Aún no estás en ninguna liga. Crea una e invita a tus amigos." action={<Link to="/league" className="btn-primary">Crear liga</Link>} />
      ) : (
        <ul className="mt-2">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link to={`/league/${l.id}`} className="row group">
                <span className="flex-1 font-display text-[1.35rem] font-extrabold text-pine uppercase">{l.name}</span>
                <span className="text-xs text-muted">{l.memberIds.length} {l.memberIds.length === 1 ? 'participante' : 'participantes'}</span>
                <Icon name="arrow" className="size-4 text-pine transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const tournament = useCurrentTournament()
  const [entries, setEntries] = useState([])
  useEffect(() => subscribeMyEntries(user.uid, setEntries, console.error), [user.uid])
  const entry = tournament && entries.find((e) => e.tournamentId === tournament.id)

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4">
      {tournament === undefined ? (
        <Skeleton className="mb-5 h-28" />
      ) : !tournament ? (
        <div className="card mb-5"><EmptyState title="Todavía no hay torneo esta semana. Vuelve en unos días." /></div>
      ) : (
        <div className="mb-5"><TournamentCard tournament={tournament} /></div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div>{tournament && <MyTeam tournament={tournament} user={user} profile={profile} entry={entry} />}</div>
        <MySeason user={user} season={tournament?.season ?? new Date().getFullYear()} liveEntry={entry} />
      </div>
    </div>
  )
}
