import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { subscribeToActiveTournament, getPicks, savePicks, subscribeToPlayers } from '../services/firestoreService'
import { playerValue, TEAM_SIZE, BUDGET } from '../utils/scoring'
import PageHeader from '../components/ui/PageHeader'
import Skeleton from '../components/ui/Skeleton'
import EmptyState from '../components/ui/EmptyState'
import Avatar from '../components/ui/Avatar'
import Icon from '../components/ui/Icon'

function Message({ children }) {
  return <div className="mx-auto max-w-4xl px-4 py-10"><div className="card"><EmptyState title={children} /></div></div>
}

export default function DraftPage() {
  const { user, profile } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState([])
  const [existingPicks, setExistingPicks] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [loadingTournament, setLoadingTournament] = useState(true)

  useEffect(() => {
    return subscribeToActiveTournament((t) => { setTournament(t); setLoadingTournament(false) })
  }, [])

  useEffect(() => subscribeToPlayers(setPlayers), [])

  useEffect(() => {
    if (!user || !profile?.leagueId || !tournament) return
    getPicks(user.uid, profile.leagueId, tournament.id).then((picks) => {
      if (picks) { setExistingPicks(picks); setSelected(picks.playerIds) }
    })
  }, [user, profile?.leagueId, tournament])

  const budgetUsed = selected.reduce((sum, id) => {
    const p = players.find((pl) => pl.id === id)
    return sum + (p ? playerValue(p.owgr) : 0)
  }, 0)
  const budgetLeft = BUDGET - budgetUsed
  const filteredPlayers = players
    .filter((p) => p.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.owgr || 999) - (b.owgr || 999))
  const selectedPlayers = selected.map((id) => players.find((p) => p.id === id)).filter(Boolean)

  function togglePlayer(player) {
    if (selected.includes(player.id)) { setSelected((prev) => prev.filter((id) => id !== player.id)); return }
    if (selected.length >= TEAM_SIZE || budgetLeft < playerValue(player.owgr)) return
    setSelected((prev) => [...prev, player.id])
  }

  async function handleSave() {
    if (!tournament || !profile?.leagueId || selected.length !== TEAM_SIZE) return
    setSaving(true)
    setError('')
    try {
      await savePicks(user.uid, profile.leagueId, tournament.id, selected)
      setExistingPicks({ playerIds: selected })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar el equipo. Inténtalo de nuevo.')
    }
    setSaving(false)
  }

  if (loadingTournament) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        <Skeleton className="mb-4 h-10 w-52" />
        <Skeleton className="h-14" count={5} />
      </div>
    )
  }
  if (!tournament) return <Message>No hay torneo activo para fichar jugadores.</Message>
  if (!profile?.leagueId) return <Message>Debes unirte a una liga antes de elegir tu equipo.</Message>

  const budgetLow = budgetLeft < 10

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <PageHeader title="Elige tu equipo" subtitle={`${tournament.name} · Selecciona ${TEAM_SIZE} jugadores`} />

      <section className="card animate-fade-up px-5 py-4 [animation-delay:50ms]">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-muted">Presupuesto usado</span>
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
          <label className="relative mb-3 block">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
            <input className="input-field pl-10" placeholder="Buscar jugador..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          {players.length === 0 ? (
            <div className="card"><EmptyState title="Esperando a que el administrador cargue los jugadores..." /></div>
          ) : (
            <ul className="flex max-h-[60vh] flex-col gap-1.5 overflow-y-auto pr-1">
              {filteredPlayers.map((player) => {
                const isSelected = selected.includes(player.id)
                const value = playerValue(player.owgr)
                const disabled = !isSelected && (selected.length >= TEAM_SIZE || budgetLeft < value)
                return (
                  <li key={player.id}>
                    <button
                      onClick={() => togglePlayer(player)}
                      disabled={disabled}
                      aria-pressed={isSelected}
                      className={`list-row w-full justify-between text-left transition-all disabled:cursor-not-allowed disabled:opacity-45 ${isSelected ? 'list-row-highlight' : 'hover:not-disabled:bg-white/7'}`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Avatar src={player.photoURL} name={player.name} size="sm" />
                        <div>
                          <p className="text-sm font-medium text-cream">{player.name}</p>
                          <p className="text-xs text-muted">{player.country}{player.owgr ? ` · OWGR #${player.owgr}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-sm font-semibold text-gold-500">{value}M</span>
                        {isSelected && <Icon name="check" className="size-4 text-pine-400" />}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <aside className="md:col-span-2">
          <div className="card sticky top-20 p-5">
            <h3 className="mb-4 text-[0.95rem] font-semibold">Mi equipo ({selected.length}/{TEAM_SIZE})</h3>
            <ol className="mb-4 flex flex-col gap-2">
              {Array.from({ length: TEAM_SIZE }, (_, i) => {
                const p = selectedPlayers[i]
                return (
                  <li key={i} className={`flex min-h-11 items-center gap-2 rounded-md border px-2.5 py-2 ${p ? 'border-gold-500/20 bg-gold-500/8' : 'border-white/6 bg-white/3'}`}>
                    <span className="min-w-4 font-mono text-xs text-muted">{i + 1}</span>
                    {p ? (
                      <>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-cream">{p.name}</p>
                          <p className="text-xs text-muted">{playerValue(p.owgr)}M</p>
                        </div>
                        <button onClick={() => togglePlayer(p)} className="p-1 text-muted hover:text-danger" aria-label={`Quitar a ${p.name}`}>
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
            <button className="btn-primary w-full" disabled={selected.length !== TEAM_SIZE || saving} onClick={handleSave}>
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : existingPicks ? 'Actualizar equipo' : 'Confirmar equipo'}
            </button>
            {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          </div>
        </aside>
      </div>
    </div>
  )
}
