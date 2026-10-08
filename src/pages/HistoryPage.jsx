import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePlayers } from '../hooks/useTournament'
import { subscribeMyEntries } from '../services/firestoreService'
import { clubColor } from '../lib/clubs'
import { formatDateRange } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import Ordinal from '../components/ui/Ordinal'
import Points from '../components/ui/Points'
import TeamList from '../components/ui/TeamList'

function Stat({ label, children }) {
  return (
    <div className="rounded-2xl bg-white/10 px-2 py-3 text-center">
      <p className="score text-[1.9rem]">{children}</p>
      <p className="mt-1 text-[0.62rem] font-semibold tracking-[0.12em] text-white/75 uppercase">{label}</p>
    </div>
  )
}

// El equipo de un torneo pasado, con los puntos finales de cada jugador
function PastTeam({ entry, clubBg }) {
  const { byId, loading } = usePlayers(entry.tournamentId)
  if (loading) return <Skeleton className="my-3 h-14" count={3} />
  return <TeamList playerIds={entry.playerIds} captainId={entry.captainId} playersById={byId} clubBg={clubBg} tournamentId={entry.tournamentId} />
}

export default function HistoryPage() {
  const { user, profile } = useAuth()
  const [entries, setEntries] = useState(null)
  const [open, setOpen] = useState(null)
  const club = clubColor(profile?.color, user.uid)

  useEffect(() => subscribeMyEntries(user.uid, setEntries, (err) => { console.error(err); setEntries([]) }), [user.uid])

  const sorted = useMemo(() => [...(entries ?? [])].sort((a, b) => (b.startDate ?? '').localeCompare(a.startDate ?? '')), [entries])
  const stats = useMemo(() => {
    const done = sorted.filter((e) => e.final)
    return {
      played: done.length,
      wins: done.filter((e) => e.rank === 1).length,
      best: done.length ? Math.min(...done.map((e) => e.rank)) : null,
      average: done.length ? Math.round(done.reduce((s, e) => s + e.points, 0) / done.length) : 0,
    }
  }, [sorted])

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <PageHeader eyebrow={profile?.clubName ?? 'Tu trayectoria'} title="Historial" subtitle="Todos tus torneos, tus puestos y tus equipos" />

      <section className="relative mb-5 animate-fade-up overflow-hidden rounded-[1.6rem] p-4 text-white" style={{ background: club.bg }}>
        <div className="halftone absolute inset-0" />
        <div className="relative grid grid-cols-4 gap-2">
          <Stat label="Torneos">{stats.played}</Stat>
          <Stat label="Victorias">{stats.wins}</Stat>
          <Stat label="Mejor"><Ordinal value={stats.best} /></Stat>
          <Stat label="Media">{stats.average}</Stat>
        </div>
      </section>

      {entries === null ? (
        <Skeleton className="h-20" count={4} />
      ) : !sorted.length ? (
        <div className="card"><EmptyState title="Aquí aparecerán tus torneos en cuanto juegues el primero." /></div>
      ) : (
        <ol className="flex flex-col gap-3">
          {sorted.map((e, i) => (
            <li key={e.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <button className="card flex w-full items-center gap-4 px-4 py-3.5 text-left transition-transform active:scale-[0.99]" onClick={() => setOpen(open === e.id ? null : e.id)} aria-expanded={open === e.id}>
                <span className={`flex size-14 shrink-0 items-center justify-center rounded-full score text-[1.9rem] ${e.rank === 1 ? 'bg-pine text-white' : 'bg-bg text-pine'}`}>
                  <Ordinal value={e.rank} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[1.35rem] leading-tight font-extrabold text-pine uppercase">{e.tournamentName}</span>
                  <span className="block text-xs text-muted">
                    {formatDateRange(e.startDate)} · {e.rank}º de {e.teamCount}{e.final ? '' : ' · en juego'}
                  </span>
                </span>
                <Points value={e.points} className="text-[1.8rem]" />
                <Icon name="plus" className={`size-4 shrink-0 text-pine transition-transform ${open === e.id ? 'rotate-45' : ''}`} />
              </button>
              {open === e.id && (
                <div className="card mt-2 animate-fade-in px-4 pt-3 pb-1" style={{ borderTop: `4px solid ${club.bg}` }}>
                  <PastTeam entry={e} clubBg={club.bg} />
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
