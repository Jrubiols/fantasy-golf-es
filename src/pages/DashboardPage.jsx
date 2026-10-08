import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { subscribeToActiveTournament, getPicks, getLeague } from '../services/firestoreService'
import { fetchTournamentScoreboard, parseLeaderboard, TOURS } from '../services/espnApi'
import { calculatePlayerPoints } from '../utils/scoring'
import { firstName, golfScoreClass } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Points from '../components/ui/Points'
import TournamentStatus from '../components/ui/TournamentStatus'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [myPicks, setMyPicks] = useState(null)
  const [myPlayers, setMyPlayers] = useState([])
  const [league, setLeague] = useState(null)
  const [loadingTournament, setLoadingTournament] = useState(true)
  const [loadingPicks, setLoadingPicks] = useState(true)

  useEffect(() => {
    return subscribeToActiveTournament((t) => { setTournament(t); setLoadingTournament(false) })
  }, [])

  useEffect(() => {
    if (profile?.leagueId) getLeague(profile.leagueId).then(setLeague)
  }, [profile?.leagueId])

  useEffect(() => {
    if (loadingTournament) return
    if (!user || !profile?.leagueId || !tournament) { setLoadingPicks(false); return }
    getPicks(user.uid, profile.leagueId, tournament.id).then((picks) => { setMyPicks(picks); setLoadingPicks(false) })
  }, [user, profile?.leagueId, tournament, loadingTournament])

  useEffect(() => {
    if (!tournament || !myPicks?.playerIds?.length) return
    fetchTournamentScoreboard(tournament.tour || TOURS.PGA)
      .then((data) => {
        const all = parseLeaderboard(data)
        setMyPlayers(myPicks.playerIds.map((id) => all.find((p) => p.id === id)).filter(Boolean))
      })
      .catch(console.error)
  }, [tournament, myPicks])

  const totalPoints = myPlayers.reduce((sum, p) => sum + calculatePlayerPoints(p), 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <PageHeader eyebrow="Bienvenido de nuevo" title={firstName(user?.displayName)} />

      {loadingTournament ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : !tournament ? (
        <div className="card p-5"><EmptyState title="No hay torneo activo en este momento" /></div>
      ) : (
        <section className="card flex animate-fade-up items-center justify-between border-gold-500/30 px-6 py-5 [animation-delay:50ms]">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <TournamentStatus status={tournament.status} />
              {tournament.round && <span className="text-xs text-muted">Ronda {tournament.round}</span>}
            </div>
            <h2 className="font-display text-xl font-bold text-cream">{tournament.name}</h2>
            <p className="mt-0.5 text-sm text-muted">{tournament.venue}{tournament.city ? ` · ${tournament.city}` : ''}</p>
          </div>
          <span className="text-3xl" aria-hidden="true">🏌️</span>
        </section>
      )}

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <section className="card animate-fade-up p-5 [animation-delay:100ms]">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold">Mi Equipo</h3>
            {myPicks && <Points value={totalPoints} suffix=" pts" className="text-lg" />}
          </div>
          {loadingPicks ? (
            <Skeleton count={3} />
          ) : !tournament ? (
            <p className="text-sm text-muted">Esperando el próximo torneo...</p>
          ) : !myPicks ? (
            <EmptyState title="Aún no has elegido tu equipo" action={<Link to="/draft" className="btn-primary">Elegir jugadores ⛳</Link>} />
          ) : myPlayers.length === 0 ? (
            <p className="text-sm text-muted">Cargando datos del torneo...</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {myPlayers.map((p) => (
                <li key={p.id} className="list-row justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="min-w-7 text-xs text-muted">{p.positionDisplay}</span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-sm">
                    <span className={golfScoreClass(p.totalScoreValue)}>{p.totalScore}</span>
                    <Points value={calculatePlayerPoints(p)} className="min-w-10 text-right" />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card animate-fade-up p-5 [animation-delay:150ms]">
          <h3 className="mb-4 font-semibold">Mi Liga</h3>
          {!profile?.leagueId ? (
            <EmptyState title="No perteneces a ninguna liga todavía" action={<Link to="/league" className="btn-primary w-full">Crear o unirse a una liga</Link>} />
          ) : !league ? (
            <Skeleton className="h-20" />
          ) : (
            <>
              <div className="mb-4 rounded-lg border border-gold-500/15 bg-gold-500/7 p-4">
                <p className="font-display text-lg font-bold text-gold-500">{league.name}</p>
                <p className="mt-1 text-xs text-muted">{league.members?.length} participantes</p>
                <p className="mt-2 text-xs text-muted">
                  Código: <span className="font-mono font-semibold text-cream">{league.code}</span>
                </p>
              </div>
              <Link to="/league" className="btn-secondary w-full">Ver clasificación →</Link>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
