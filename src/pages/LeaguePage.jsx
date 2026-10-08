import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, useLocked, usePlayers } from '../hooks/useTournament'
import { useEntries, useGroupStandings, useProfiles, useSeasonStandings } from '../hooks/useLeagueData'
import { createLeague, deleteLeague, joinLeague, leaveLeague, renameLeague, subscribeLeague, subscribeMyLeagues } from '../services/firestoreService'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import Skeleton from '../components/ui/Skeleton'
import StandingsList from '../components/ui/StandingsList'
import Tabs from '../components/ui/Tabs'
import TeamList from '../components/ui/TeamList'

const MODES = [
  { id: 'join', label: 'Unirse con código' },
  { id: 'create', label: 'Crear liga' },
]

function JoinOrCreate({ uid, onDone }) {
  const [mode, setMode] = useState('join')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (mode === 'create' && name.trim().length < 3) { setError('El nombre necesita al menos 3 letras'); return }
    setLoading(true)
    try {
      onDone(mode === 'join' ? await joinLeague(uid, code) : await createLeague(uid, name.trim()))
    } catch (err) {
      console.error(err)
      setError(err.message?.startsWith('No existe') || err.message?.startsWith('Ya estás') ? err.message : 'Algo ha fallado. Inténtalo de nuevo.')
    }
    setLoading(false)
  }

  return (
    <section className="card animate-fade-up p-5 [animation-delay:100ms]">
      <Tabs tabs={MODES} value={mode} onChange={(m) => { setMode(m); setError('') }} className="mb-5" />
      <form onSubmit={handleSubmit}>
        {mode === 'join' ? (
          <>
            <label htmlFor="league-code" className="mb-2 block text-sm text-muted">Código que te han pasado</label>
            <input id="league-code" className="input-field mb-4 font-mono tracking-widest uppercase" placeholder="Ej: AB3X9K" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} autoComplete="off" />
            <button type="submit" className="btn-primary w-full" disabled={loading || code.length !== 6}>{loading ? 'Buscando...' : 'Unirme →'}</button>
          </>
        ) : (
          <>
            <label htmlFor="league-name" className="mb-2 block text-sm text-muted">Nombre de la liga</label>
            <input id="league-name" className="input-field mb-4" placeholder="Ej: Liga del Domingo" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Creando...' : 'Crear liga 🏆'}</button>
          </>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </form>
    </section>
  )
}

function useMyLeagues(uid) {
  const [leagues, setLeagues] = useState(null)
  useEffect(() => subscribeMyLeagues(uid, (list) => setLeagues(list.sort((a, b) => a.name.localeCompare(b.name))), (err) => {
    console.error(err)
    setLeagues([])
  }), [uid])
  return leagues
}

function LeagueList() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const leagues = useMyLeagues(user.uid)

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader title="Mis ligas" subtitle="Compite con tus amigos en ligas privadas" />
      {leagues === null ? (
        <Skeleton className="mb-5 h-16" count={2} />
      ) : leagues.length > 0 && (
        <ul className="mb-5 flex animate-fade-up flex-col gap-2 [animation-delay:50ms]">
          {leagues.map((l) => (
            <li key={l.id}>
              <Link to={`/league/${l.id}`} className="card flex items-center justify-between px-5 py-4 transition-colors hover:border-gold-500/40">
                <div>
                  <p className="font-display text-lg font-bold text-gold-500">{l.name}</p>
                  <p className="text-xs text-muted">{l.memberIds.length} {l.memberIds.length === 1 ? 'participante' : 'participantes'}{l.ownerUid === user.uid ? ' · la creaste tú' : ''}</p>
                </div>
                <span className="text-muted" aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {leagues?.length === 0 && <p className="mb-4 text-sm text-muted">Todavía no estás en ninguna liga. Crea una e invita a tus amigos con el código, o únete a la de alguien.</p>}
      <JoinOrCreate uid={user.uid} onDone={(id) => navigate(`/league/${id}`)} />
    </div>
  )
}

const VIEWS = [
  { id: 'tournament', label: 'Torneo' },
  { id: 'season', label: 'Temporada' },
]

function LeagueDetail({ leagueId }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [league, setLeague] = useState(undefined)
  const [view, setView] = useState('tournament')
  const [copied, setCopied] = useState(false)
  const tournament = useCurrentTournament()
  const { locked } = useLocked(tournament)
  const { byId } = usePlayers(locked ? tournament?.id : null)
  const entries = useEntries(tournament?.id)
  const season = useSeasonStandings(tournament?.season)

  useEffect(() => subscribeLeague(leagueId, setLeague, () => setLeague(null)), [leagueId])

  const memberIds = useMemo(() => league?.memberIds ?? [], [league])
  const profiles = useProfiles(memberIds)

  // La temporada en directo: lo ya cerrado más los puntos del torneo en juego
  const liveSeason = useMemo(() => {
    if (!season || !entries) return null
    const byUid = new Map(season.map((s) => [s.uid, { ...s }]))
    for (const e of entries.filter((e) => !e.final)) {
      const row = byUid.get(e.uid) ?? { uid: e.uid, displayName: e.displayName, photoURL: e.photoURL, points: 0, tournaments: 0 }
      byUid.set(e.uid, { ...row, points: Math.round((row.points + e.points) * 10) / 10, live: true })
    }
    return [...byUid.values()]
  }, [season, entries])

  const tournamentRows = useGroupStandings(memberIds, entries, profiles)
  const seasonRows = useGroupStandings(memberIds, liveSeason, profiles)

  if (league === undefined) return <div className="mx-auto max-w-2xl px-4 py-6"><Skeleton className="mb-4 h-10 w-52" /><Skeleton className="h-14" count={4} /></div>
  if (!league) return <div className="mx-auto max-w-2xl px-4 py-10"><div className="card"><EmptyState title="Esta liga no existe o ya no formas parte de ella." action={<Link to="/league" className="btn-secondary">Volver a mis ligas</Link>} /></div></div>

  const isOwner = league.ownerUid === user.uid

  async function copyInvite() {
    const text = `¡Únete a mi liga "${league.name}" en Fantasy Golf ES! Código: ${league.code} — ${window.location.origin}/league`
    try {
      if (navigator.share) await navigator.share({ title: 'Fantasy Golf ES', text })
      else {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch { /* el usuario cerró el diálogo de compartir */ }
  }

  async function handleRename() {
    const name = window.prompt('Nuevo nombre de la liga', league.name)?.trim()
    if (name && name.length >= 3 && name !== league.name) await renameLeague(league.id, name.slice(0, 40))
  }

  async function handleLeave() {
    if (!window.confirm(`¿Seguro que quieres salir de "${league.name}"?`)) return
    await leaveLeague(user.uid, league.id)
    navigate('/league')
  }

  async function handleDelete() {
    if (!window.confirm(`¿Borrar "${league.name}" para todos sus participantes? No se puede deshacer.`)) return
    await deleteLeague(league)
    navigate('/league')
  }

  const rows = view === 'tournament' ? tournamentRows : seasonRows
  const entryByUid = Object.fromEntries((entries ?? []).map((e) => [e.uid, e]))

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <Link to="/league" className="mb-3 inline-block text-sm text-muted hover:text-cream">← Mis ligas</Link>
      <PageHeader title={league.name} subtitle={`${league.memberIds.length} ${league.memberIds.length === 1 ? 'participante' : 'participantes'}`}>
        {isOwner && <button className="btn-secondary btn-sm" onClick={handleRename}>Renombrar</button>}
      </PageHeader>

      <section className="card mb-5 flex animate-fade-up items-center justify-between gap-3 border-gold-500/20 px-5 py-4 [animation-delay:50ms]">
        <div>
          <p className="mb-0.5 text-xs text-muted">Código de invitación</p>
          <span className="font-mono text-2xl font-bold tracking-[0.15em] text-gold-500">{league.code}</span>
        </div>
        <button className="btn-secondary btn-sm" onClick={copyInvite}>
          <Icon name={copied ? 'check' : 'copy'} className="size-4" />
          {copied ? 'Copiado' : 'Invitar'}
        </button>
      </section>

      <Tabs tabs={VIEWS} value={view} onChange={setView} className="mb-4" />

      <section className="card animate-fade-up p-5 [animation-delay:100ms]">
        <h2 className="mb-1 font-semibold">{view === 'tournament' ? tournament?.name ?? 'Torneo' : `Temporada ${tournament?.season ?? ''}`}</h2>
        <p className="mb-4 text-xs text-muted">
          {view === 'tournament'
            ? locked ? 'Pulsa en un participante para ver su equipo' : 'Los equipos se descubren cuando empieza el torneo'
            : 'Suma de todos los torneos de la temporada, incluido el que está en juego'}
        </p>
        {!tournament ? (
          <EmptyState title="Todavía no hay torneo esta semana." />
        ) : !rows ? (
          <Skeleton className="h-13" count={3} />
        ) : (
          <StandingsList
            rows={rows}
            currentUid={user.uid}
            renderDetail={view === 'tournament' && locked ? (s) => entryByUid[s.uid] && <TeamList playerIds={entryByUid[s.uid].playerIds} captainId={entryByUid[s.uid].captainId} playersById={byId} /> : undefined}
            meta={view === 'season' ? (s) => (s.tournaments ? `${s.tournaments} ${s.tournaments === 1 ? 'torneo' : 'torneos'}${s.wins ? ` · ${s.wins} 🏆` : ''}` : s.live ? 'en juego' : null) : undefined}
          />
        )}
      </section>

      <div className="mt-6 text-center">
        {isOwner
          ? <button className="btn-danger" onClick={handleDelete}>Borrar liga</button>
          : <button className="btn-danger" onClick={handleLeave}>Salir de la liga</button>}
      </div>
    </div>
  )
}

export default function LeaguePage() {
  const { leagueId } = useParams()
  return leagueId ? <LeagueDetail key={leagueId} leagueId={leagueId} /> : <LeagueList />
}
