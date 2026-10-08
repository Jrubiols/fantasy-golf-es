import { useState } from 'react'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../services/firebase'
import { useAuth } from '../../hooks/useAuth'
import { useMyPropPicks, usePropStandings, useTournamentProps } from '../../hooks/useProps'
import { STATS } from '../../lib/props'
import { formatCountdown } from '../../utils/format'
import Avatar from './Avatar'
import EmptyState from './EmptyState'
import Ordinal from './Ordinal'
import PlayerPhoto from './PlayerPhoto'

const decimal = (n) => String(n).replace('.', ',')

function Choice({ active, onClick, disabled, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`h-9 min-w-[3.7rem] rounded-full px-2.5 font-display text-[0.95rem] font-extrabold uppercase transition-all disabled:cursor-default ${active ? 'bg-mint text-pine-dark' : 'bg-white/10 text-white hover:not-disabled:bg-white/20'} ${disabled && !active ? 'opacity-40' : ''}`}
    >
      {children}
    </button>
  )
}

/** «Más o Menos» de la ronda: responder antes de la primera salida y ver los aciertos al terminar. */
export function MoreLessCard({ tournament }) {
  const { user, profile } = useAuth()
  const props = useTournamentProps(tournament.id)
  const shown = props?.current ?? props?.last
  const pick = useMyPropPicks(shown?.id, user.uid)
  const standings = usePropStandings(tournament.season)
  const [error, setError] = useState('')

  if (!shown) return null
  const lockAt = shown.lockAt?.toMillis?.() ?? 0
  const now = Date.now()
  const open = !shown.resolved && now < lockAt
  const choices = pick?.choices ?? {}
  const graded = shown.items.filter((it) => it.outcome && choices[it.id])
  const correct = graded.filter((it) => choices[it.id] === it.outcome).length
  const me = standings?.find((s) => s.uid === user.uid)

  async function answer(itemId, value) {
    setError('')
    const next = { ...choices, [itemId]: value }
    try {
      await setDoc(doc(db, 'propPicks', `${shown.id}_${user.uid}`), {
        uid: user.uid, propsId: shown.id, choices: next,
        displayName: profile?.displayName ?? user.displayName ?? 'Jugador', updatedAt: serverTimestamp(),
      })
    } catch (err) {
      console.error(err)
      setError('Ya ha empezado la ronda: las respuestas están cerradas.')
    }
  }

  return (
    <section className="relative mt-4 animate-fade-up overflow-hidden rounded-[1.6rem] bg-[#2a2d2a] p-5 text-white">
      <div className="halftone absolute inset-0" />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-mint uppercase">Ronda {shown.round} · gratis</p>
          <h2 className="mt-1 font-display text-[2.2rem] leading-none font-black uppercase">Más o menos</h2>
          <p className="mt-1.5 text-sm text-white/70">
            {open ? `Acierta qué harán en la ronda. Cierra en ${formatCountdown(lockAt - now)}.` : shown.resolved ? `Ronda corregida: ${correct} de ${graded.length}.` : 'Ronda en juego: se corrige al terminar.'}
          </p>
        </div>
        {me && (
          <div className="text-right">
            <p className="text-[0.62rem] font-semibold tracking-[0.14em] text-white/70 uppercase">Temporada</p>
            <p className="score text-[1.8rem]">{me.correct}<span className="text-base text-white/60">/{me.total}</span></p>
          </div>
        )}
      </div>

      <ul className="relative mt-4 flex flex-col gap-2">
        {shown.items.map((it) => {
          const mine = choices[it.id]
          const hit = it.outcome && mine ? mine === it.outcome : null
          return (
            <li key={it.id} className="flex items-center gap-3 rounded-2xl bg-white/6 p-2.5">
              <PlayerPhoto src={it.photoURL} name={it.name} size="sm" bg="#11663a" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{it.name}</p>
                <p className="text-xs text-white/70">
                  {decimal(it.line)} {STATS[it.stat].label}
                  {it.value != null && <> · hizo <strong className="text-white">{it.value}</strong></>}
                </p>
              </div>
              {hit !== null ? (
                <span className={`score text-xl ${hit ? 'text-mint' : 'text-[#ff8a80]'}`}>{hit ? '✓' : '✗'}</span>
              ) : (
                <div className="flex gap-1.5">
                  <Choice active={mine === 'more'} disabled={!open} onClick={() => answer(it.id, 'more')}>Más</Choice>
                  <Choice active={mine === 'less'} disabled={!open} onClick={() => answer(it.id, 'less')}>Menos</Choice>
                </div>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="relative mt-2 text-sm text-[#ffb4ab]">{error}</p>}
    </section>
  )
}

/** Clasificación de aciertos de «Más o Menos» (de una liga o de todos). */
export function MoreLessStandings({ season, memberIds, profiles = {}, currentUid }) {
  const rows = usePropStandings(season, memberIds)
  if (!rows) return null
  if (!rows.length) return <div className="card"><EmptyState title="Aún no se ha corregido ninguna ronda de «Más o menos»." /></div>
  return (
    <ol className="card px-4 py-1">
      {rows.map((r, i) => {
        const p = profiles[r.uid] ?? {}
        return (
          <li key={r.uid} className={`row ${r.uid === currentUid ? 'font-semibold' : ''}`}>
            <span className="score w-9 text-[1.5rem] text-pine"><Ordinal value={i + 1} /></span>
            <Avatar name={p.displayName ?? r.displayName} color={p.color} uid={r.uid} />
            <span className="min-w-0 flex-1 truncate">{p.displayName ?? r.displayName}</span>
            <span className="score text-[1.5rem] text-pine">{r.correct}<span className="text-base text-muted">/{r.total}</span></span>
          </li>
        )
      })}
    </ol>
  )
}
