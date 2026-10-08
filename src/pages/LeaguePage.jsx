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
import WeekStats from '../components/ui/WeekStats'
import LockerRoom from '../components/ui/LockerRoom'
import { MoreLessStandings } from '../components/ui/MoreLess'
import { OadStandings } from '../components/ui/OneAndDone'
import { useOadResults } from '../hooks/useOneAndDone'
import { drawLeagueSummary, shareImage } from '../lib/shareImage'
import { seasonDuels } from '../lib/duels'
import Ordinal from '../components/ui/Ordinal'
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
  { id: 'duels', label: 'Duelos' },
  { id: 'winners', label: 'Ganadores' },
]

// Duelos cara a cara: el de esta semana en grande y la tabla de la temporada
function Duels({ duels, profiles, currentUid, currentTournamentId }) {
  if (!duels) return <Skeleton className="h-40 rounded-[1.6rem]" count={2} />
  const name = (uid) => profiles[uid]?.displayName ?? 'Jugador'
  const color = (uid) => clubColor(profiles[uid]?.color, uid).bg
  const thisWeek = duels.weeks.find((w) => w.tournamentId === currentTournamentId)
  const mine = thisWeek?.duels.find((d) => d.a === currentUid || d.b === currentUid)
  const me = mine && (mine.a === currentUid ? { uid: mine.a, pts: mine.aPoints } : { uid: mine.b, pts: mine.bPoints })
  const rival = mine && (mine.a === currentUid ? { uid: mine.b, pts: mine.bPoints } : { uid: mine.a, pts: mine.aPoints })

  return (
    <div className="flex flex-col gap-4">
      {mine && (
        <section className="relative flex h-44 animate-fade-up overflow-hidden rounded-[1.6rem] text-white">
          {[me, rival].map((side, i) => (
            <div key={i} className={`relative flex flex-1 flex-col justify-between p-4 ${i ? 'items-end text-right' : ''}`} style={{ background: side.uid ? color(side.uid) : '#2a2d2a' }}>
              <div className="halftone absolute inset-0" />
              <span className="relative text-[0.68rem] font-semibold tracking-[0.14em] text-white/80 uppercase">{i ? 'Rival' : 'Tú'}</span>
              <div className="relative">
                <p className="score text-[3rem]">{side.uid ? side.pts : '–'}</p>
                <p className="truncate text-sm font-semibold">{side.uid ? name(side.uid) : 'Descansas'}</p>
              </div>
            </div>
          ))}
          <span className="absolute top-1/2 left-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white font-display text-xl font-black text-pine shadow-lg">VS</span>
          {rival.uid && (
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-[0.7rem] font-semibold whitespace-nowrap backdrop-blur">
              {mine.winner === currentUid ? (mine.final ? 'Ganaste' : 'Vas ganando') : mine.winner === null ? 'Empate' : mine.final ? 'Perdiste' : 'Vas perdiendo'}
            </span>
          )}
        </section>
      )}

      <section className="card px-4 pt-3 pb-2">
        <div className="grid grid-cols-[2rem_minmax(0,1fr)_repeat(4,1.8rem)_2.4rem] items-center pb-1.5 text-center label">
          <span className="text-left">#</span><span className="text-left">Jugador</span><span>G</span><span>E</span><span>P</span><span>PJ</span><span className="text-right">Pts</span>
        </div>
        {duels.table.map((row, i) => (
          <div key={row.uid} className={`grid min-h-[3.4rem] grid-cols-[2rem_minmax(0,1fr)_repeat(4,1.8rem)_2.4rem] items-center border-t border-line text-center text-sm ${row.uid === currentUid ? 'font-semibold' : ''}`}>
            <span className="score text-left text-xl text-pine"><Ordinal value={i + 1} /></span>
            <span className="flex min-w-0 items-center gap-2 text-left">
              <Avatar name={name(row.uid)} color={profiles[row.uid]?.color} uid={row.uid} size="sm" />
              <span className="truncate">{name(row.uid)}</span>
            </span>
            <span>{row.won}</span><span>{row.drawn}</span><span>{row.lost}</span><span className="text-muted">{row.played}</span>
            <span className="score text-right text-xl text-pine">{row.points}</span>
          </div>
        ))}
      </section>

      {duels.weeks.filter((w) => w.duels.some((d) => d.final)).reverse().map((w) => (
        <section key={w.tournamentId} className="card px-4 py-3">
          <p className="mb-1 font-display text-[1.15rem] font-extrabold text-pine uppercase">{w.tournamentName}</p>
          {w.duels.filter((d) => d.b).map((d) => (
            <div key={`${d.a}-${d.b}`} className="row py-2 text-sm">
              <span className={`min-w-0 flex-1 truncate ${d.winner === d.a ? 'font-semibold text-pine' : 'text-muted'}`}>{name(d.a)}</span>
              <span className="score text-lg">{d.aPoints}</span>
              <span className="text-faint">–</span>
              <span className="score text-lg">{d.bPoints}</span>
              <span className={`min-w-0 flex-1 truncate text-right ${d.winner === d.b ? 'font-semibold text-pine' : 'text-muted'}`}>{name(d.b)}</span>
            </div>
          ))}
        </section>
      ))}
    </div>
  )
}


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
  const [sharing, setSharing] = useState(false)
  const tournament = useCurrentTournament()
  const { locked } = useLocked(tournament)
  const { players, byId } = usePlayers(locked ? tournament?.id : null)
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

  const { weeks, finals } = useWeeklyWinners(tournament?.season, memberIds)
  const oadResults = useOadResults(tournament?.season)
  // Duelos: torneos terminados de la temporada más el que está en juego
  const duels = useMemo(() => {
    if (!finals || !entries) return null
    const byTournament = new Map()
    for (const e of [...finals, ...entries.filter((e) => !e.final)]) {
      const t = byTournament.get(e.tournamentId) ?? { tournamentId: e.tournamentId, tournamentName: e.tournamentName, startDate: e.startDate, entries: [] }
      t.entries.push(e)
      byTournament.set(e.tournamentId, t)
    }
    const list = [...byTournament.values()]
      .filter((t) => t.entries.some((e) => memberIds.includes(e.uid)))
      .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    return seasonDuels(list, memberIds)
  }, [finals, entries, memberIds])
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

  // Imagen con el podio de la liga y el MVP, lista para WhatsApp
  async function shareSummary() {
    setSharing(true)
    try {
      const picked = new Set((entries ?? []).filter((e) => memberIds.includes(e.uid)).flatMap((e) => e.playerIds))
      const mvp = [...picked].map((id) => byId[id]).filter(Boolean).sort((a, b) => b.points - a.points)[0]
      const blob = await drawLeagueSummary({ league, tournament, rows: tournamentRows, mvp, url: inviteLink(league.code) })
      await shareImage(blob, { filename: `${league.name}-${tournament.shortName ?? tournament.name}.png`.replace(/\s+/g, '-'), text: `${league.name} · ${tournament.name}` })
    } catch (err) {
      console.error('No se pudo crear el resumen:', err)
    }
    setSharing(false)
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
          : view === 'duels' ? 'Cada semana te toca un rival de la liga · victoria 3, empate 1'
          : `Temporada ${tournament?.season ?? ''} · el mejor de la liga en cada torneo`}
      </p>

      {view === 'duels' ? (
        <Duels duels={duels} profiles={profiles} currentUid={user.uid} currentTournamentId={tournament?.id} />
      ) : view === 'winners' ? (
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
            <TeamList playerIds={entryByUid[s.uid].playerIds} captainId={entryByUid[s.uid].captainId} substitutions={entryByUid[s.uid].substitutions} chip={entryByUid[s.uid].chip} playersById={byId} clubBg={clubColor(s.color, s.uid).bg} tournamentId={tournament.id} />
          ) : undefined}
          meta={view === 'season' ? (s) => (s.tournaments ? `${s.tournaments} ${s.tournaments === 1 ? 'torneo' : 'torneos'}${s.wins ? ` · ${s.wins} ${s.wins === 1 ? 'victoria' : 'victorias'}` : ''}` : s.live ? 'en juego' : null) : undefined}
        />
      )}

      {view === 'season' && (
        <div className="mt-6">
          <h2 className="headline mb-1 px-1 text-[1.8rem]">Sin repetir</h2>
          <p className="mb-3 px-1 text-xs text-muted">Un golfista por torneo, sin repetir en la temporada · dinero ganado</p>
          <OadStandings results={oadResults} memberIds={memberIds} profiles={profiles} currentUid={user.uid} />
          <h2 className="headline mt-6 mb-1 px-1 text-[1.8rem]">Más o menos</h2>
          <p className="mb-3 px-1 text-xs text-muted">Aciertos de la temporada en las preguntas de cada ronda</p>
          <MoreLessStandings season={tournament?.season} memberIds={memberIds} profiles={profiles} currentUid={user.uid} />
        </div>
      )}

      {view === 'tournament' && locked && tournamentRows?.some((r) => r.points != null) && (
        <button className="btn-primary mt-4 w-full" onClick={shareSummary} disabled={sharing}>
          <Icon name="share" className="size-4" />{sharing ? 'Preparando imagen...' : 'Compartir resumen'}
        </button>
      )}

      {view === 'tournament' && locked && tournament?.status !== 'scheduled' && (
        <WeekStats players={players} entries={(entries ?? []).filter((e) => memberIds.includes(e.uid))} tournamentId={tournament.id} scopeLabel="la liga" />
      )}

      <LockerRoom leagueId={league.id} />

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
