import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { formatMoney, oadStandings, useOadResults } from '../../hooks/useOneAndDone'
import { db } from '../../services/firebase'
import { useAuth } from '../../hooks/useAuth'
import { clubColor } from '../../lib/clubs'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import Icon from './Icon'
import Ordinal from './Ordinal'
import PlayerPhoto from './PlayerPhoto'
import Skeleton from './Skeleton'

export function OadStandings({ results, memberIds, profiles = {}, currentUid }) {
  const rows = useMemo(() => oadStandings(results, memberIds), [results, memberIds])
  if (!results) return <Skeleton className="h-14" count={3} />
  if (!rows.length) return <div className="card"><EmptyState title="Nadie ha jugado todavía a «Sin repetir». Elige tu golfista en Mi equipo." /></div>
  return (
    <ol className="card px-4 py-1">
      {rows.map((r, i) => {
        const p = profiles[r.uid] ?? {}
        return (
          <li key={r.uid} className={`row ${r.uid === currentUid ? 'font-semibold' : ''}`}>
            <span className="score w-9 text-[1.5rem] text-pine"><Ordinal value={i + 1} /></span>
            <Avatar name={p.displayName ?? r.displayName} color={p.color} uid={r.uid} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{p.displayName ?? r.displayName}</span>
              <span className="text-xs font-normal text-muted">{r.played} {r.played === 1 ? 'torneo' : 'torneos'}</span>
            </span>
            <span className="score text-[1.5rem] text-pine">{formatMoney(r.earnings)}</span>
          </li>
        )
      })}
    </ol>
  )
}

/**
 * Tarjeta de «Sin repetir» en Mi equipo: elegir golfista y suplente (sin los ya usados en la
 * temporada) o, con el torneo cerrado, ver cómo va.
 */
export function OadCard({ tournament, players, byId, locked }) {
  const { user, profile } = useAuth()
  const results = useOadResults(tournament.season)
  const [pick, setPick] = useState(undefined)
  const [picking, setPicking] = useState(null) // null · 'player' · 'alternate'
  const [draft, setDraft] = useState({})
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const club = clubColor(profile?.color, user.uid)
  const id = `${tournament.id}_${user.uid}`

  useEffect(() => { getDoc(doc(db, 'oadPicks', id)).then((s) => setPick(s.exists() ? s.data() : null)).catch(() => setPick(null)) }, [id])

  const mine = (results ?? []).filter((r) => r.uid === user.uid)
  const used = new Map(mine.filter((r) => r.tournamentId !== tournament.id && !r.reused).map((r) => [r.playerId, r.tournamentName]))
  const result = mine.find((r) => r.tournamentId === tournament.id)
  const total = mine.reduce((s, r) => s + (r.earnings ?? 0), 0)

  const candidates = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (players ?? [])
      .filter((p) => !term || p.name.toLowerCase().includes(term))
      .sort((a, b) => (a.owgr ?? 9999) - (b.owgr ?? 9999))
  }, [players, search])

  async function choose(player) {
    setError('')
    if (picking === 'player') {
      setDraft({ playerId: player.id })
      setPicking('alternate')
      setSearch('')
      return
    }
    const next = { ...draft, alternateId: player.id }
    try {
      await setDoc(doc(db, 'oadPicks', id), {
        uid: user.uid, tournamentId: tournament.id, season: tournament.season,
        playerId: next.playerId, alternateId: next.alternateId,
        displayName: profile?.displayName ?? user.displayName ?? 'Jugador', updatedAt: serverTimestamp(),
      })
      setPick(next)
      setPicking(null)
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar. Puede que ya haya empezado el torneo.')
    }
  }

  if (pick === undefined) return <Skeleton className="mt-5 h-40 rounded-[1.6rem]" />
  const titular = byId[result?.playerId ?? pick?.playerId]
  const alternate = byId[pick?.alternateId]

  return (
    <section className="mt-5 animate-fade-up overflow-hidden rounded-[1.6rem] bg-navy text-white">
      <div className="relative p-5">
        <div className="halftone absolute inset-0" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-mint uppercase">Modo extra · temporada {tournament.season}</p>
            <h2 className="mt-1 font-display text-[2.2rem] leading-none font-black uppercase">Sin repetir</h2>
            <p className="mt-1.5 max-w-xs text-sm text-white/75">Un golfista por torneo: sumas el dinero que gane. No puedes repetirlo en toda la temporada.</p>
          </div>
          <div className="text-right">
            <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/70 uppercase">Llevas</p>
            <p className="score text-[1.8rem]">{formatMoney(total)}</p>
          </div>
        </div>

        {picking ? (
          <div className="relative mt-4 rounded-2xl bg-white p-3 text-ink">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="font-display text-lg font-extrabold text-pine uppercase">{picking === 'player' ? '1 · Elige tu golfista' : '2 · Elige un suplente'}</p>
              <button onClick={() => { setPicking(null); setSearch('') }} className="p-1 text-muted" aria-label="Cancelar"><Icon name="close" className="size-4" /></button>
            </div>
            {picking === 'alternate' && <p className="mb-2 px-1 text-xs text-muted">Juega si {byId[draft.playerId]?.shortName} se retira antes de empezar.</p>}
            <input className="input-field mb-2 bg-bg" placeholder="Buscar jugador" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar jugador" />
            <ul className="max-h-72 overflow-y-auto px-1">
              {candidates.map((p) => {
                const usedIn = used.get(p.id)
                const disabled = Boolean(usedIn) || (picking === 'alternate' && p.id === draft.playerId)
                return (
                  <li key={p.id}>
                    <button onClick={() => choose(p)} disabled={disabled} className="row w-full text-left disabled:opacity-40">
                      <PlayerPhoto src={p.photoURL} name={p.name} size="sm" />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.name}</span><span className="text-xs text-muted">{usedIn ? `Ya lo usaste en ${usedIn}` : p.owgr ? `OWGR #${p.owgr}` : p.country}</span></span>
                      {!disabled && <Icon name="plus" className="size-4 text-pine" />}
                    </button>
                  </li>
                )
              })}
            </ul>
            {error && <p className="mt-2 px-1 text-sm text-over">{error}</p>}
          </div>
        ) : titular ? (
          <div className="relative mt-4 flex items-center gap-3 rounded-2xl bg-white/10 p-3">
            <PlayerPhoto src={titular.photoURL} name={titular.name} bg={club.bg} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{titular.name}</p>
              <p className="text-xs text-white/70">
                {locked
                  ? result?.reused ? 'Ya lo habías usado: no suma' : `${titular.positionDisplay}${result?.usedAlternate ? ' · entró el suplente' : ''}`
                  : `Suplente: ${alternate?.shortName ?? '—'}`}
              </p>
            </div>
            {locked
              ? <span className="score text-[1.6rem]">{result?.final ? formatMoney(result.earnings) : 'En juego'}</span>
              : <button className="h-10 rounded-full bg-white px-4 font-display text-base font-extrabold text-navy uppercase" onClick={() => setPicking('player')}>Cambiar</button>}
          </div>
        ) : locked ? (
          <p className="relative mt-4 rounded-2xl bg-white/10 p-3 text-sm text-white/75">No elegiste golfista para este torneo.</p>
        ) : (
          <button className="relative mt-4 flex h-13 w-full items-center justify-between rounded-full bg-white px-6 font-display text-[1.25rem] font-extrabold text-navy uppercase" onClick={() => setPicking('player')}>
            Elegir golfista <Icon name="arrow" />
          </button>
        )}
      </div>
    </section>
  )
}
