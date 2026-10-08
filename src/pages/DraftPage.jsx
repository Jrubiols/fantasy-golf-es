import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { subscribeToActiveTournament, getPicks, savePicks, subscribeToPlayers } from '../services/firestoreService'
import { playerValue, TEAM_SIZE, BUDGET } from '../utils/scoring'

export default function DraftPage() {
  const { user, profile } = useAuth()
  const [tournament, setTournament] = useState(null)
  const [players, setPlayers] = useState([])
  const [selected, setSelected] = useState([])
  const [existingPicks, setExistingPicks] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingTournament, setLoadingTournament] = useState(true)

  useEffect(() => {
    const unsub = subscribeToActiveTournament((t) => { setTournament(t); setLoadingTournament(false) })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = subscribeToPlayers(setPlayers)
    return unsub
  }, [])

  useEffect(() => {
    if (!user || !profile?.leagueId || !tournament) return
    getPicks(user.uid, profile.leagueId, tournament.id).then((picks) => {
      if (picks) { setExistingPicks(picks); setSelected(picks.playerIds) }
    })
  }, [user, profile, tournament])

  const budgetUsed = selected.reduce((sum, id) => { const p = players.find((pl) => pl.id === id); return sum + (p ? playerValue(p.owgr) : 0) }, 0)
  const budgetLeft = BUDGET - budgetUsed
  const filteredPlayers = players.filter((p) => p.name?.toLowerCase().includes(search.toLowerCase())).sort((a, b) => (a.owgr || 999) - (b.owgr || 999))
  const selectedPlayers = selected.map((id) => players.find((p) => p.id === id)).filter(Boolean)

  function togglePlayer(player) {
    if (selected.includes(player.id)) { setSelected((prev) => prev.filter((id) => id !== player.id)); return }
    if (selected.length >= TEAM_SIZE) return
    if (budgetLeft < playerValue(player.owgr)) return
    setSelected((prev) => [...prev, player.id])
  }

  async function handleSave() {
    if (!tournament || !profile?.leagueId || selected.length !== TEAM_SIZE) return
    setSaving(true)
    try {
      await savePicks(user.uid, profile.leagueId, tournament.id, selected)
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  if (loadingTournament) return <div className="max-w-5xl mx-auto px-4 py-6"><div className="skeleton" style={{ height: 40, width: 200, marginBottom: '1rem' }} />{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 56, marginBottom: '0.5rem' }} />)}</div>
  if (!tournament) return <div className="max-w-4xl mx-auto px-4 py-10 text-center"><p style={{ color: 'var(--text-muted)' }}>No hay torneo activo para fichar jugadores.</p></div>
  if (!profile?.leagueId) return <div className="max-w-4xl mx-auto px-4 py-10 text-center"><p style={{ color: 'var(--text-muted)' }}>Debes unirte a una liga antes de elegir tu equipo.</p></div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'Playfair Display, serif' }}>Elige tu equipo</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{tournament.name} · Selecciona {TEAM_SIZE} jugadores</p>
      </div>

      {/* Presupuesto */}
      <div className="card animate-fade-up" style={{ padding: '1rem 1.25rem', animationDelay: '0.05s', opacity: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Presupuesto usado</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>
            <span style={{ color: budgetLeft < 5 ? '#e57373' : 'var(--gold)' }}>{budgetUsed}M</span>
            <span style={{ color: 'var(--text-muted)' }}> / {BUDGET}M</span>
          </span>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 4, height: 6, overflow: 'hidden' }}>
          <div style={{ width: `${Math.min((budgetUsed/BUDGET)*100, 100)}%`, height: '100%', background: budgetLeft < 10 ? '#e57373' : 'var(--gold)', borderRadius: 4, transition: 'width 0.3s ease' }} />
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>{budgetLeft}M disponibles · {selected.length}/{TEAM_SIZE} jugadores</p>
      </div>

      <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }} className="md:grid-cols-5">
        {/* Lista jugadores */}
        <div style={{ gridColumn: 'span 3' }}>
          <input className="input-field" placeholder="Buscar jugador..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ marginBottom: '0.75rem' }} />
          {players.length === 0 ? (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}><p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Esperando a que el administrador cargue los jugadores...</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '60vh', overflowY: 'auto' }}>
              {filteredPlayers.map((player) => {
                const isSelected = selected.includes(player.id)
                const value = playerValue(player.owgr)
                const disabled = !isSelected && (selected.length >= TEAM_SIZE || budgetLeft < value)
                return (
                  <button key={player.id} onClick={() => togglePlayer(player)} disabled={disabled}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0.9rem', background: isSelected ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSelected ? 'rgba(201,168,76,0.35)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '8px', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1, transition: 'all 0.15s', textAlign: 'left', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {player.photoURL ? <img src={player.photoURL} alt={player.name} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        : <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--green-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{player.name?.[0]}</div>}
                      <div>
                        <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--cream)' }}>{player.name}</p>
                        <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{player.country}{player.owgr ? ` · OWGR #${player.owgr}` : ''}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--gold)', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{value}M</span>
                      {isSelected && <span style={{ color: 'var(--green-light)', fontSize: '1rem' }}>✓</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Panel equipo */}
        <div style={{ gridColumn: 'span 2' }}>
          <div className="card" style={{ padding: '1.25rem', position: 'sticky', top: '5rem' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '0.95rem' }}>Mi equipo ({selected.length}/{TEAM_SIZE})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
              {Array.from({ length: TEAM_SIZE }).map((_, i) => {
                const p = selectedPlayers[i]
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.6rem', background: p ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '6px', border: `1px solid ${p ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)'}`, minHeight: 42 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', minWidth: 16, fontFamily: 'DM Mono, monospace' }}>{i + 1}</span>
                    {p ? (<><div style={{ flex: 1 }}><p style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--cream)' }}>{p.name}</p><p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{playerValue(p.owgr)}M</p></div><button onClick={() => togglePlayer(p)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>✕</button></>)
                      : <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>— Vacío —</span>}
                  </div>
                )
              })}
            </div>
            <button className="btn-primary" style={{ width: '100%' }} disabled={selected.length !== TEAM_SIZE || saving} onClick={handleSave}>
              {saving ? 'Guardando...' : saved ? '✓ Guardado' : existingPicks ? 'Actualizar equipo' : 'Confirmar equipo'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
