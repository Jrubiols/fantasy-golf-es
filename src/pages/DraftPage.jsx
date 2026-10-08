import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useCurrentTournament, useLocked, usePlayers } from '../hooks/useTournament'
import { getMyPicks, savePicks } from '../services/firestoreService'
import { BUDGET, CAPTAIN_MULTIPLIER, POSITION_POINTS, RULES, TEAM_SIZE } from '../lib/scoring'
import { formatPrice } from '../utils/format'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Avatar from '../components/ui/Avatar'
import Icon from '../components/ui/Icon'
import TeamList from '../components/ui/TeamList'
import TournamentCard from '../components/ui/TournamentCard'
import Points from '../components/ui/Points'

const SORTS = {
  price: { label: 'Precio', compare: (a, b) => b.price - a.price || a.name.localeCompare(b.name) },
  owgr: { label: 'Ranking', compare: (a, b) => (a.owgr ?? 9999) - (b.owgr ?? 9999) },
  name: { label: 'Nombre', compare: (a, b) => a.name.localeCompare(b.name) },
}

function Message({ children, action }) {
  return <div className="mx-auto max-w-4xl px-4 py-10"><div className="card"><EmptyState title={children} action={action} /></div></div>
}

function ScoringRules() {
  return (
    <details className="card mt-5 px-5 py-4 text-sm">
      <summary className="cursor-pointer font-semibold">¿Cómo se puntúa?</summary>
      <div className="mt-3 grid gap-4 sm:grid-cols-2">
        <ul className="flex flex-col gap-1">
          {RULES.map((r) => (
            <li key={r.label} className="flex justify-between gap-4"><span className="text-muted">{r.label}</span><Points value={r.points} /></li>
          ))}
        </ul>
        <div>
          <p className="mb-1 text-muted">Bonus por posición</p>
          <ul className="flex flex-col gap-1">
            {POSITION_POINTS.map(([upTo, pts], i) => {
              const from = i === 0 ? 1 : POSITION_POINTS[i - 1][0] + 1
              return (
                <li key={upTo} className="flex justify-between gap-4">
                  <span className="text-muted">{from === upTo ? `${upTo}º` : `${from}º – ${upTo}º`}</span>
                  <Points value={pts} />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
      <p className="mt-3 text-muted">
        Tu <strong className="text-gold-500">capitán</strong> suma x{CAPTAIN_MULTIPLIER}. Los precios salen del ranking mundial (OWGR) y
        se fijan al publicarse los inscritos. Puedes cambiar el equipo cuantas veces quieras hasta la primera salida del torneo.
      </p>
    </details>
  )
}

export default function DraftPage() {
  const { user } = useAuth()
  const tournament = useCurrentTournament()
  const { players, byId, loading: loadingPlayers } = usePlayers(tournament?.id)
  const { locked } = useLocked(tournament)

  const [saved, setSaved] = useState(undefined) // undefined: cargando · null: sin equipo
  const [selected, setSelected] = useState([])
  const [captainId, setCaptainId] = useState(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('price')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState(null)

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
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Skeleton className="mb-4 h-10 w-52" />
        <Skeleton className="mb-4 h-28" />
        <Skeleton className="h-14" count={5} />
      </div>
    )
  }
  if (!tournament) return <Message>Todavía no hay torneo esta semana. Vuelve en unos días.</Message>

  // Equipos cerrados: el equipo ya no se toca y se ven sus puntos en directo
  if (locked) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader title="Mi equipo" />
        <TournamentCard tournament={tournament} />
        <section className="card mt-5 animate-fade-up p-5 [animation-delay:100ms]">
          {saved ? (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-semibold">Tu equipo</h3>
                <span className="text-xs text-muted">Coste {formatPrice(saved.cost)}</span>
              </div>
              <TeamList playerIds={saved.playerIds} captainId={saved.captainId} playersById={byId} />
              <Link to="/league" className="btn-secondary mt-4 w-full">Ver mis ligas →</Link>
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
      <div className="mx-auto max-w-3xl px-4 py-6">
        <PageHeader title="Mi equipo" />
        <TournamentCard tournament={tournament} />
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
      setStatus({ ok: true, text: 'Equipo guardado' })
    } catch (err) {
      console.error(err)
      setStatus({ ok: false, text: err.code === 'permission-denied' ? 'No se pudo guardar: los equipos ya están cerrados o algún precio ha cambiado. Recarga la página.' : 'No se pudo guardar el equipo. Inténtalo de nuevo.' })
    }
    setSaving(false)
  }

  const budgetLow = budgetLeft < 10
  const ready = selected.length === TEAM_SIZE && captainId && budgetLeft >= 0

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader title="Mi equipo" subtitle={`Elige ${TEAM_SIZE} jugadores con ${BUDGET}M y nombra a tu capitán`} />
      <TournamentCard tournament={tournament} />

      <section className="card mt-5 animate-fade-up px-5 py-4 [animation-delay:80ms]">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted">Presupuesto</span>
          <span className="font-mono font-semibold">
            <span className={budgetLow ? 'text-danger' : 'text-gold-500'}>{budgetUsed}M</span>
            <span className="text-muted"> / {BUDGET}M</span>
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded bg-white/8">
          <div className={`h-full rounded transition-[width] duration-300 ${budgetLow ? 'bg-danger' : 'bg-gold-500'}`} style={{ width: `${Math.min((budgetUsed / BUDGET) * 100, 100)}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-muted">{budgetLeft}M disponibles · {selected.length}/{TEAM_SIZE} jugadores</p>
      </section>

      <div className="mt-5 grid gap-5 md:grid-cols-5">
        <div className="md:col-span-3">
          <div className="mb-3 flex gap-2">
            <label className="relative block flex-1">
              <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
              <input className="input-field pl-10" placeholder="Buscar jugador..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </label>
            <select className="input-field w-auto" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Ordenar por">
              {Object.entries(SORTS).map(([id, s]) => <option key={id} value={id} className="bg-pine-950">{s.label}</option>)}
            </select>
          </div>
          <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-1">
            {visible.map((player) => {
              const isSelected = selected.includes(player.id)
              const disabled = !isSelected && (selected.length >= TEAM_SIZE || budgetLeft < player.price)
              return (
                <li key={player.id}>
                  <button
                    onClick={() => toggle(player)}
                    disabled={disabled}
                    aria-pressed={isSelected}
                    className={`list-row w-full justify-between text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${isSelected ? 'list-row-highlight' : 'hover:not-disabled:bg-white/7'}`}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar src={player.photoURL} name={player.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-cream">{player.name}</p>
                        <p className="text-xs text-muted">{player.country}{player.owgr ? ` · OWGR #${player.owgr}` : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-sm font-semibold text-gold-500">{formatPrice(player.price)}</span>
                      {isSelected && <Icon name="check" className="size-4 text-pine-400" />}
                    </div>
                  </button>
                </li>
              )
            })}
            {!visible.length && <li><EmptyState title="Ningún jugador coincide con la búsqueda" /></li>}
          </ul>
        </div>

        <aside className="md:col-span-2">
          <div className="card sticky top-20 p-5">
            <h3 className="mb-1 text-[0.95rem] font-semibold">Tu equipo ({selected.length}/{TEAM_SIZE})</h3>
            <p className="mb-4 text-xs text-muted">Pulsa la estrella para elegir capitán (x{CAPTAIN_MULTIPLIER})</p>
            <ol className="mb-4 flex flex-col gap-2">
              {Array.from({ length: TEAM_SIZE }, (_, i) => {
                const p = byId[selected[i]]
                const isCaptain = p && p.id === captainId
                return (
                  <li key={i} className={`flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2 ${p ? 'border-gold-500/20 bg-gold-500/8' : 'border-white/6 bg-white/3'}`}>
                    <span className="min-w-4 font-mono text-xs text-muted">{i + 1}</span>
                    {p ? (
                      <>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-cream">{p.name}</p>
                          <p className="text-xs text-muted">{formatPrice(p.price)}</p>
                        </div>
                        <button
                          onClick={() => { setCaptainId(p.id); setStatus(null) }}
                          className={`rounded px-1.5 py-0.5 text-sm ${isCaptain ? 'bg-gold-500 text-pine-950' : 'text-muted hover:text-gold-500'}`}
                          aria-pressed={isCaptain}
                          aria-label={`Hacer capitán a ${p.name}`}
                          title="Capitán"
                        >
                          ★
                        </button>
                        <button onClick={() => toggle(p)} className="p-1 text-muted hover:text-danger" aria-label={`Quitar a ${p.name}`}>
                          <Icon name="close" className="size-4" />
                        </button>
                      </>
                    ) : (
                      <span className="text-sm text-muted">— Vacío —</span>
                    )}
                  </li>
                )
              })}
            </ol>
            <button className="btn-primary w-full" disabled={!ready || !dirty || saving} onClick={handleSave}>
              {saving ? 'Guardando...' : !dirty ? '✓ Equipo guardado' : saved ? 'Guardar cambios' : 'Confirmar equipo'}
            </button>
            {status && <p role="status" className={`mt-3 text-sm ${status.ok ? 'text-pine-400' : 'text-danger'}`}>{status.text}</p>}
            {saved && dirty && !status && <p className="mt-3 text-xs text-gold-300">Tienes cambios sin guardar</p>}
          </div>
        </aside>
      </div>

      <ScoringRules />
    </div>
  )
}

