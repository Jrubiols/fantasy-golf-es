import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, useLocked, usePlayers } from '../hooks/useTournament'
import { useEntries, useGroupStandings, useProfiles, useSeasonStandings, useWeeklyWinners } from '../hooks/useLeagueData'
import { backfillInviteName, createLeague, deleteLeague, inviteLink, joinLeague, leaveLeague, renameLeague, subscribeLeague, subscribeMyLeagues } from '../services/firestoreService'
import { clubColor } from '../lib/clubs'
import { formatDateRange } from '../utils/format'
import Avatar from '../components/ui/Avatar'
import Points from '../components/ui/Points'
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
            <label htmlFor="league-code" className="label mb-2 block">Código que te han pasado</label>
            <input id="league-code" className="input-field mb-4 bg-bg text-center font-display text-2xl font-black tracking-[0.3em] text-pine uppercase" placeholder="AB3X9K" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} maxLength={6} autoComplete="off" />
            <button type="submit" className="btn-primary w-full" disabled={loading || code.length !== 6}>{loading ? 'Buscando...' : 'Unirme'}</button>
          </>
        ) : (
          <>
            <label htmlFor="league-name" className="label mb-2 block">Nombre de la liga</label>
            <input id="league-name" className="input-field mb-4 bg-bg" placeholder="Ej: Liga del Domingo" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Creando...' : 'Crear liga'}</button>
          </>
        )}
        {error && <p className="mt-3 text-sm text-over">{error}</p>}
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
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <PageHeader eyebrow="Ligas privadas" title="Mis ligas" subtitle="Compite con tus amigos torneo a torneo y en la temporada" />
      {leagues === null ? (
        <Skeleton className="mb-5 h-20" count={2} />
      ) : leagues.length > 0 && (
        <ul className="mb-5 flex flex-col gap-3">
          {leagues.map((l, i) => (
            <li key={l.id} className="animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
              <Link to={`/league/${l.id}`} className="relative flex items-center justify-between overflow-hidden rounded-[1.6rem] bg-pine px-6 py-5 text-white transition-transform active:scale-[0.99]">
                <div className="halftone absolute inset-0" />
                <div className="relative">
                  <p className="font-display text-[2rem] leading-none font-black uppercase">{l.name}</p>
                  <p className="mt-1.5 text-xs text-white/75">{l.memberIds.length} {l.memberIds.length === 1 ? 'participante' : 'participantes'}{l.ownerUid === user.uid ? ' · la creaste tú' : ''}</p>
                </div>
                <span className="relative flex size-11 items-center justify-center rounded-full bg-white text-pine"><Icon name="arrow" /></span>
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
  { id: 'winners', label: 'Ganadores' },
]

// Quién ganó cada semana dentro de la liga
function Winners({ weeks, profiles, currentUid }) {
  if (!weeks) return <Skeleton className="h-20" count={3} />
  if (!weeks.length) return <div className="card"><EmptyState title="Cuando termine el primer torneo, aquí verás quién lo ganó." /></div>
  return (
    <ol className="flex flex-col gap-3">
      {weeks.map((w, i) => (
        <li key={w.tournamentId} className="card animate-fade-up px-4 py-3.5" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-display text-[1.3rem] leading-tight font-extrabold text-pine uppercase">{w.tournamentName}</p>
            <p className="shrink-0 text-xs text-muted">{formatDateRange(w.startDate)}</p>
          </div>
          {w.winners.map((e) => {
            const p = profiles[e.uid] ?? {}
            return (
              <div key={e.uid} className="mt-2.5 flex items-center gap-3">
                <Avatar name={p.displayName ?? e.displayName} color={p.color ?? e.color} uid={e.uid} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {p.displayName ?? e.displayName}
                    {e.uid === currentUid && <span className="ml-1.5 text-xs text-pine">tú</span>}
                  </span>
                  <span className="block text-xs text-muted">Ganó entre {w.count} · {e.rank}º en el ranking general</span>
                </span>
                <Points value={e.points} className="text-[1.7rem]" />
              </div>
            )
          })}
        </li>
      ))}
    </ol>
  )
}


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

  const ownsLeague = league?.ownerUid === user.uid
  useEffect(() => {
    if (ownsLeague) backfillInviteName(league).catch(() => {})
  }, [ownsLeague, league])

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

  const weeks = useWeeklyWinners(tournament?.season, memberIds)
  const tournamentRows = useGroupStandings(memberIds, entries, profiles)
  const seasonRows = useGroupStandings(memberIds, liveSeason, profiles)

  if (league === undefined) return <div className="mx-auto max-w-2xl px-4 pt-4"><Skeleton className="mb-4 h-20 w-64" /><Skeleton className="h-44 rounded-[1.6rem]" count={3} /></div>
  if (!league) return <div className="mx-auto max-w-2xl px-4 pt-6"><div className="card"><EmptyState title="Esta liga no existe o ya no formas parte de ella." action={<Link to="/league" className="btn-secondary">Volver a mis ligas</Link>} /></div></div>

  const isOwner = league.ownerUid === user.uid

  async function copyInvite() {
    const url = inviteLink(league.code)
    const text = `¡Únete a mi liga "${league.name}" en Fantasy Golf ES! Entra aquí:`
    try {
      if (navigator.share) await navigator.share({ title: 'Fantasy Golf ES', text, url })
      else {
        await navigator.clipboard.writeText(`${text} ${url}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch { /* el usuario cerró el diálogo de compartir */ }
  }

  async function handleRename() {
    const name = window.prompt('Nuevo nombre de la liga', league.name)?.trim()
    if (name && name.length >= 3 && name !== league.name) await renameLeague(league, name.slice(0, 40))
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

  const entryByUid = Object.fromEntries((entries ?? []).map((e) => [e.uid, e]))
  // En el torneo, cada tarjeta lleva la foto del capitán de ese jugador
  const rows = view === 'tournament'
    ? tournamentRows?.map((r) => ({ ...r, photo: byId[entryByUid[r.uid]?.captainId]?.photoURL }))
    : seasonRows

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <Link to="/league" className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-pine"><Icon name="back" className="size-4" />Mis ligas</Link>
      <PageHeader title={league.name} subtitle={`${league.memberIds.length} ${league.memberIds.length === 1 ? 'participante' : 'participantes'}`}>
        {isOwner && <button className="btn-ghost btn-sm" onClick={handleRename}>Renombrar</button>}
      </PageHeader>

      <div className="mb-5 flex animate-fade-up items-center gap-2 [animation-delay:50ms]">
        <span className="inline-flex h-11 items-center gap-2.5 rounded-full bg-surface px-5 text-xs text-muted">
          CÓDIGO <strong className="font-display text-[1.4rem] font-black tracking-[0.1em] text-pine">{league.code}</strong>
        </span>
        <button className="btn-primary h-11" onClick={copyInvite}>
          <Icon name={copied ? 'check' : 'share'} className="size-4" />
          {copied ? 'Copiado' : 'Invitar'}
        </button>
      </div>

      <Tabs tabs={VIEWS} value={view} onChange={setView} className="mb-3" />
      <p className="mb-4 px-1 text-xs text-muted">
        {view === 'tournament'
          ? !tournament ? '' : locked ? `${tournament.name} · pulsa en un participante para ver su equipo` : `${tournament.name} · los equipos se descubren cuando empieza el torneo`
          : view === 'season' ? `Temporada ${tournament?.season ?? ''} · suma de todos los torneos, incluido el que está en juego`
          : `Temporada ${tournament?.season ?? ''} · el mejor de la liga en cada torneo`}
      </p>

      {view === 'winners' ? (
        <Winners weeks={weeks} profiles={profiles} currentUid={user.uid} />
      ) : !tournament ? (
        <div className="card"><EmptyState title="Todavía no hay torneo esta semana." /></div>
      ) : !rows ? (
        <Skeleton className="h-44 rounded-[1.6rem]" count={3} />
      ) : (
        <StandingsList
          rows={rows}
          currentUid={user.uid}
          cards={view === 'tournament' && !locked ? 0 : 3}
          renderDetail={view === 'tournament' && locked ? (s) => entryByUid[s.uid] && (
            <TeamList playerIds={entryByUid[s.uid].playerIds} captainId={entryByUid[s.uid].captainId} substitutions={entryByUid[s.uid].substitutions} playersById={byId} clubBg={clubColor(s.color, s.uid).bg} tournamentId={tournament.id} />
          ) : undefined}
          meta={view === 'season' ? (s) => (s.tournaments ? `${s.tournaments} ${s.tournaments === 1 ? 'torneo' : 'torneos'}${s.wins ? ` · ${s.wins} ${s.wins === 1 ? 'victoria' : 'victorias'}` : ''}` : s.live ? 'en juego' : null) : undefined}
        />
      )}

      <div className="mt-8 text-center">
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
