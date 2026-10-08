import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { fetchTournamentScoreboard, parseLeaderboard, parseActiveTournament, TOURS } from '../../services/espnApi'
import { setActiveTournament, cachePlayers, getActiveTournament } from '../../services/firestoreService'
import { playerValue } from '../../utils/scoring'

export default function AdminPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [tour, setTour] = useState(TOURS.PGA)
  const [preview, setPreview] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTournament, setActiveTournamentState] = useState(null)
  const [status, setStatus] = useState('')

  useEffect(() => {
    if (profile && !profile.isAdmin) navigate('/dashboard')
  }, [profile, navigate])

  useEffect(() => {
    getActiveTournament().then(setActiveTournamentState)
  }, [])

  async function handleFetchPreview() {
    setLoading(true); setStatus('')
    try {
      const data = await fetchTournamentScoreboard(tour)
      setPreview(parseActiveTournament(data))
      setPlayers(parseLeaderboard(data))
      setStatus(`✓ ${parseLeaderboard(data).length} jugadores cargados desde ESPN`)
    } catch (err) { setStatus(`Error: ${err.message}`) }
    setLoading(false)
  }

  async function handleActivate() {
    if (!preview) return
    setLoading(true)
    try {
      await setActiveTournament({ ...preview, tour })
      await cachePlayers(players.map((p) => ({ id: p.id, name: p.name, shortName: p.shortName, country: p.country, photoURL: p.photoURL, owgr: p.owgr || null, value: playerValue(p.owgr) })))
      setActiveTournamentState({ ...preview, tour })
      setStatus('✓ Torneo activado y jugadores cacheados en Firestore')
    } catch (err) { setStatus(`Error: ${err.message}`) }
    setLoading(false)
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-10">
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#e57373', fontFamily: 'Playfair Display, serif' }}>Panel de Admin</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Solo visible para administradores</p>
      </div>

      {activeTournament && (
        <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', borderColor: 'rgba(76,175,125,0.3)' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--green-light)', marginBottom: '0.25rem', fontWeight: 600 }}>TORNEO ACTIVO ACTUAL</p>
          <p style={{ fontWeight: 600 }}>{activeTournament.name}</p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Tour: {activeTournament.tour?.toUpperCase()} · ID: {activeTournament.id}</p>
        </div>
      )}

      <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>1. Seleccionar tour</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {Object.entries(TOURS).map(([key, val]) => (
            <button key={val} onClick={() => setTour(val)} style={{ padding: '0.5rem 1rem', borderRadius: 8, border: `1px solid ${tour === val ? 'var(--gold)' : 'rgba(255,255,255,0.15)'}`, background: tour === val ? 'rgba(201,168,76,0.12)' : 'transparent', color: tour === val ? 'var(--gold)' : 'var(--text-muted)', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', fontWeight: tour === val ? 600 : 400, fontSize: '0.85rem' }}>
              {key}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={handleFetchPreview} disabled={loading}>
          {loading ? 'Cargando ESPN...' : 'Obtener torneo actual de ESPN →'}
        </button>
      </div>

      {preview && (
        <div className="card" style={{ padding: '1.5rem', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>2. Revisar y activar</h2>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
            <p style={{ fontWeight: 600, marginBottom: '0.3rem' }}>{preview.name}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{preview.venue}{preview.city ? ` · ${preview.city}` : ''}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>Estado: {preview.statusDisplay || preview.status} · ID: {preview.id}</p>
            <p style={{ color: 'var(--gold)', fontSize: '0.82rem', marginTop: '0.5rem' }}>{players.length} jugadores disponibles</p>
          </div>
          <button className="btn-primary" onClick={handleActivate} disabled={loading}>
            {loading ? 'Activando...' : '⚡ Activar este torneo y cachear jugadores'}
          </button>
        </div>
      )}

      {players.length > 0 && (
        <div className="card" style={{ padding: '1.25rem' }}>
          <h2 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>Jugadores cargados ({players.length})</h2>
          <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {players.slice(0, 60).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: 6, fontSize: '0.82rem' }}>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: 24, fontFamily: 'DM Mono, monospace' }}>{i + 1}</span>
                  <span>{p.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{p.country}</span>
                </div>
                <span style={{ color: 'var(--gold)', fontFamily: 'DM Mono, monospace' }}>{playerValue(p.owgr)}M</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {status && (
        <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', borderRadius: 8, background: status.includes('Error') ? 'rgba(229,115,115,0.1)' : 'rgba(76,175,125,0.1)', border: `1px solid ${status.includes('Error') ? 'rgba(229,115,115,0.3)' : 'rgba(76,175,125,0.3)'}`, color: status.includes('Error') ? '#e57373' : 'var(--green-light)', fontSize: '0.85rem' }}>
          {status}
        </div>
      )}
    </div>
  )
}
