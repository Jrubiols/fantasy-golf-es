import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, useLocked, usePlayers } from '../hooks/useTournament'
import { getMyPicks, savePicks, subscribeEntry } from '../services/firestoreService'
import { BUDGET, CAPTAIN_MULTIPLIER, POSITION_POINTS, RULES, TEAM_SIZE } from '../lib/scoring'
import { clubColor } from '../lib/clubs'
import { formatPrice } from '../utils/format'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import PlayerPhoto from '../components/ui/PlayerPhoto'
import Points from '../components/ui/Points'
import TeamList from '../components/ui/TeamList'
import TournamentCard from '../components/ui/TournamentCard'

const SORTS = {
  price: { label: 'Precio', compare: (a, b) => b.price - a.price || a.name.localeCompare(b.name) },
  owgr: { label: 'Ranking', compare: (a, b) => (a.owgr ?? 9999) - (b.owgr ?? 9999) },
  name: { label: 'Nombre', compare: (a, b) => a.name.localeCompare(b.name) },
}
const SORT_IDS = Object.keys(SORTS)

function ScoringRules() {
  return (
    <details className="card group mt-5 px-5 py-4 text-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="headline text-[1.5rem]">¿Cómo se puntúa?</span>
        <Icon name="plus" className="size-5 text-pine transition-transform group-open:rotate-45" />
      </summary>
      <div className="mt-4 grid gap-5 sm:grid-cols-2">
        <ul>
          {RULES.map((r) => (
            <li key={r.label} className="row justify-between py-2"><span className="text-muted">{r.label}</span><Points value={r.points} className="text-[1.3rem]" /></li>
          ))}
        </ul>
        <div>
          <p className="label mb-1">Bonus por posición</p>
          <ul>
            {POSITION_POINTS.map(([upTo, pts], i) => {
              const from = i === 0 ? 1 : POSITION_POINTS[i - 1][0] + 1
              return (
                <li key={upTo} className="row justify-between py-2">
                  <span className="text-muted">{from === upTo ? `${upTo}º` : `${from}º – ${upTo}º`}</span>
                  <Points value={pts} className="text-[1.3rem]" />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <p className="mt-4 text-muted">
        Tu <strong className="text-pine">capitán</strong> suma x{CAPTAIN_MULTIPLIER}. Los precios salen del ranking mundial (OWGR) y
        se fijan al publicarse los inscritos. Puedes cambiar el equipo cuantas veces quieras hasta la primera salida del torneo.
        Si un golfista tuyo se retira antes de jugar, entra solo el más caro que quepa en tu presupuesto (y hereda la capitanía).
      </p>
    </details>
  )
}

export default function DraftPage() {
  const { user, profile } = useAuth()
  const tournament = useCurrentTournament()
  const { players, byId, loading: loadingPlayers } = usePlayers(tournament?.id)
  const { locked } = useLocked(tournament)
  const club = clubColor(profile?.color, user?.uid)

  const [saved, setSaved] = useState(undefined) // undefined: cargando · null: sin equipo
  const [selected, setSelected] = useState([])
  const [captainId, setCaptainId] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('price')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)
  const [entry, setEntry] = useState(null)

  useEffect(() => {
    if (!locked || !tournament?.id || !user) return
    return subscribeEntry(tournament.id, user.uid, setEntry, () => setEntry(null))
  }, [locked, tournament?.id, user])

  useEffect(() => {
    if (!tournament?.id || !user) return
    getMyPicks(tournament.id, user.uid)
      .then((picks) => {
        setSaved(picks)
        if (picks) { setSelected(picks.playerIds); setCaptainId(picks.captainId) }
      })
      .catch((err) => { console.error(err); setSaved(null) })
  }, [tournament?.id, user])

  const budgetUsed = selected.reduce((sum, id) => sum + (byId[id]?.price ?? 0), 0)
  const budgetLeft = BUDGET - budgetUsed
  const dirty = !saved || saved.captainId !== captainId || saved.playerIds.join() !== selected.join()

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (players ?? []).filter((p) => p.price != null && (!term || p.name.toLowerCase().includes(term))).sort(SORTS[sort].compare)
  }, [players, search, sort])

  if (tournament === undefined || (tournament && (loadingPlayers || saved === undefined))) {
    return (
      <div className="mx-auto max-w-5xl px-4 pt-4">
        <Skeleton className="mb-4 h-24 w-72" />
        <Skeleton className="mb-4 h-44 rounded-[1.6rem]" />
        <Skeleton className="h-16" count={5} />
      </div>
    )
  }
  if (!tournament) {
    return <div className="mx-auto max-w-3xl px-4 pt-6"><div className="card"><EmptyState title="Todavía no hay torneo esta semana. Vuelve en unos días." /></div></div>
  }

  // Equipos cerrados: el equipo ya no se toca y se ven sus puntos en directo
  if (locked) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <TournamentCard tournament={tournament} title="Mi equipo" />
        <section className="card mt-5 animate-fade-up px-4 pt-3 pb-1 [animation-delay:100ms]">
          {saved ? (
            <>
              <div className="flex items-center justify-between pb-2">
                <span className="label">Equipos cerrados · ya cuentan los puntos</span>
                <span className="text-xs text-muted">Coste {formatPrice(saved.cost)}</span>
              </div>
              <TeamList playerIds={(entry ?? saved).playerIds} captainId={(entry ?? saved).captainId} substitutions={entry?.substitutions} playersById={byId} clubBg={club.bg} tournamentId={tournament.id} />
              <Link to="/league" className="btn-secondary my-3 w-full">Ver mis ligas</Link>
            </>
          ) : (
            <EmptyState title="No hiciste equipo para este torneo. ¡El próximo no se te escapa!" />
          )}
        </section>
        <ScoringRules />
      </div>
    )
  }

  if (!players?.length) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <TournamentCard tournament={tournament} title="Mi equipo" />
        <div className="card mt-5"><EmptyState title="La lista de inscritos se publica unos días antes del torneo. En cuanto salga podrás hacer tu equipo." /></div>
      </div>
    )
  }

  function toggle(player) {
    setStatus(null)
    if (selected.includes(player.id)) {
      setSelected((prev) => prev.filter((id) => id !== player.id))
      if (captainId === player.id) setCaptainId(null)
      return
    }
    if (selected.length >= TEAM_SIZE || budgetLeft < player.price) return
    setSelected((prev) => [...prev, player.id])
    if (!captainId) setCaptainId(player.id)
  }

  async function handleSave() {
    setSaving(true)
    setStatus(null)
    try {
      await savePicks(tournament.id, user, selected, captainId, Object.fromEntries(selected.map((id) => [id, byId[id].price])))
      setSaved({ playerIds: selected, captainId, cost: budgetUsed })
      setStatus({ ok: true, text: '¡Equipo guardado! Puedes cambiarlo hasta la primera salida.' })
    } catch (err) {
      console.error(err)
      setStatus({ ok: false, text: err.code === 'permission-denied' ? 'No se pudo guardar: los equipos ya están cerrados o algún precio ha cambiado. Recarga la página.' : 'No se pudo guardar el equipo. Inténtalo de nuevo.' })
    }
    setSaving(false)
  }

  const ready = selected.length === TEAM_SIZE && captainId && budgetLeft >= 0
  const missing = TEAM_SIZE - selected.length

  return (
    <div className="mx-auto max-w-5xl px-4 pt-4">
      <TournamentCard tournament={tournament} title="Mi equipo" />

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-start">
        {/* Presupuesto y plazas del equipo */}
        <section className="relative animate-fade-up overflow-hidden rounded-[1.6rem] bg-pine px-5 pt-5 pb-5 text-white md:sticky md:top-20">
          <div className="halftone absolute inset-0" />
          <div className="relative flex items-end justify-between">
            <div>
              <p className="text-[0.68rem] font-semibold tracking-[0.14em] text-mint uppercase">Presupuesto</p>
              <p className="score mt-1 text-[2.6rem]">{budgetUsed}M <span className="text-[1.4rem] text-white/55">/ {BUDGET}M</span></p>
            </div>
            <p className="mb-1 text-sm text-white/80">{selected.length} de {TEAM_SIZE}</p>
          </div>
          <div className="relative mt-3 h-2 overflow-hidden rounded-full bg-white/15">
            <div className={`h-full rounded-full transition-[width] duration-300 ${budgetLeft < 0 ? 'bg-over' : 'bg-mint'}`} style={{ width: `${Math.min((budgetUsed / BUDGET) * 100, 100)}%` }} />
          </div>

          <ol className="relative mt-4 grid grid-cols-6 gap-2">
            {Array.from({ length: TEAM_SIZE }, (_, i) => {
              const p = byId[selected[i]]
              if (!p) return <li key={i} className="flex aspect-square items-center justify-center rounded-full border-2 border-dashed border-white/30 text-white/55"><Icon name="plus" className="size-4" /></li>
              const isCaptain = p.id === captainId
              return (
                <li key={p.id} className="relative animate-pop">
                  <button
                    onClick={() => { setCaptainId(p.id); setStatus(null) }}
                    aria-pressed={isCaptain}
                    aria-label={`Hacer capitán a ${p.name}`}
                    title={`${p.name} · pulsa para hacerlo capitán`}
                    className={`block aspect-square w-full overflow-hidden rounded-full ${isCaptain ? 'ring-2 ring-mint ring-offset-2 ring-offset-pine' : ''}`}
                  >
                    <PlayerPhoto src={p.photoURL} name={p.name} bg={isCaptain ? club.bg : '#11663a'} className="!size-full" />
                  </button>
                  {isCaptain && <span className="absolute -top-1 -right-1 flex h-5 items-center rounded-full bg-mint px-1.5 text-[0.65rem] font-bold text-pine-dark">C</span>}
                </li>
              )
            })}
          </ol>
          <p className="relative mt-3 text-xs text-white/70">Toca una cara para hacerla capitán (x{CAPTAIN_MULTIPLIER})</p>

          <button className="relative mt-4 flex h-14 w-full items-center justify-between rounded-full bg-white px-6 font-display text-[1.35rem] font-extrabold text-pine uppercase transition-transform active:scale-[0.98] disabled:opacity-60" disabled={!ready || !dirty || saving} onClick={handleSave}>
            {saving ? 'Guardando...' : !dirty ? 'Equipo guardado' : saved ? 'Guardar cambios' : 'Confirmar equipo'}
            <span className="font-sans text-sm font-medium normal-case text-muted">
              {!dirty ? <Icon name="check" className="size-5 text-pine" /> : missing > 0 ? `Faltan ${missing}` : budgetLeft < 0 ? 'Te pasas' : `${formatPrice(budgetLeft)} libres`}
            </span>
          </button>
          {status && <p role="status" className={`relative mt-3 text-sm ${status.ok ? 'text-mint' : 'text-[#ffb4ab]'}`}>{status.text}</p>}
        </section>

        {/* Mercado de jugadores */}
        <section>
          <div className="mb-3 flex gap-2">
            <label className="relative flex-1">
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted" />
              <input className="input-field pl-11" placeholder="Buscar jugador" aria-label="Buscar jugador" value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <button className="btn-secondary px-5" onClick={() => setSort(SORT_IDS[(SORT_IDS.indexOf(sort) + 1) % SORT_IDS.length])} aria-label={`Ordenar: ${SORTS[sort].label}`}>
              {SORTS[sort].label}
            </button>
          </div>
          <ul className="card px-4">
            {visible.map((player) => {
              const isSelected = selected.includes(player.id)
              const disabled = !isSelected && (selected.length >= TEAM_SIZE || budgetLeft < player.price)
              return (
                <li key={player.id} className={`row ${disabled ? 'opacity-45' : ''}`}>
                  <Link to={`/jugador/${tournament.id}/${player.id}`} className="flex min-w-0 flex-1 items-center gap-3" aria-label={`Ficha de ${player.name}`}>
                  <PlayerPhoto src={player.photoURL} name={player.name} bg={isSelected && player.id === captainId ? club.bg : '#11663a'} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{player.name}</span>
                      {isSelected && player.id === captainId && <span className="inline-flex h-5 items-center rounded-full px-1.5 text-[0.68rem] font-bold text-white" style={{ background: club.bg }}>C</span>}
                    </span>
                    <span className="block text-xs text-muted">{player.country}{player.owgr ? ` · OWGR #${player.owgr}` : ''}</span>
                  </span>
                  </Link>
                  <span className="score text-[1.5rem] text-pine">{formatPrice(player.price)}</span>
                  <button
                    onClick={() => toggle(player)}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    aria-label={`${isSelected ? 'Quitar' : 'Añadir'} a ${player.name}`}
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-all ${isSelected ? 'bg-pine text-white' : 'border-[1.5px] border-pine text-pine hover:not-disabled:bg-pine/5 disabled:border-track disabled:text-faint'}`}
                  >
                    <Icon name={isSelected ? 'check' : 'plus'} className="size-4.5" strokeWidth={2.6} />
                  </button>
                </li>
              )
            })}
            {!visible.length && <li><EmptyState title="Ningún jugador coincide con la búsqueda" /></li>}
          </ul>
        </section>
      </div>

      <ScoringRules />
    </div>
  )
}
