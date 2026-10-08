import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { createLeague, joinLeague, getLeague, subscribeToLeagueScores, subscribeToActiveTournament } from '../services/firestoreService'

export default function LeaguePage() {
  const { user, profile } = useAuth()
  const [league, setLeague] = useState(null)
  const [scores, setScores] = useState([])
  const [tournament, setTournament] = useState(null)
  const [mode, setMode] = useState('join')
  const [inputCode, setInputCode] = useState('')
  const [leagueName, setLeagueName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const unsub = subscribeToActiveTournament(setTournament)
    return unsub
  }, [])

  useEffect(() => {
    if (profile?.leagueId) getLeague(profile.leagueId).then(setLeague)
  }, [profile])

  useEffect(() => {
    if (!league || !tournament) return
    const unsub = subscribeToLeagueScores(league.id, tournament.id, setScores)
    return unsub
  }, [league, tournament])

  async function handleJoin() {
    setError(''); setLoading(true)
    try { await joinLeague(user.uid, inputCode); const data = await getLeague(profile.leagueId); setLeague(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  async function handleCreate() {
    setError('')
    if (!leagueName.trim()) { setError('Pon un nombre a tu liga'); return }
    setLoading(true)
    try { await createLeague(user.uid, leagueName.trim()); const data = await getLeague(profile.leagueId); setLeague(data) }
    catch (err) { setError(err.message) }
    setLoading(false)
  }

  function copyCode() { navigator.clipboard.writeText(league.code); setCopied(true); setTimeout(() => setCopied(false), 2000) }

  if (!profile?.leagueId) return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'Playfair Display, serif' }}>Ligas</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Compite con tus amigos en una liga privada</p>

      <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 4, marginBottom: '1.5rem' }}>
        {['join', 'create'].map((m) => (
          <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: '0.5rem', borderRadius: 8, border: 'none', background: mode === m ? 'var(--green-mid)' : 'transparent', color: mode === m ? 'var(--cream)' : 'var(--text-muted)', fontWeight: mode === m ? 600 : 400, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.15s', fontFamily: 'DM Sans, sans-serif' }}>
            {m === 'join' ? 'Unirse a una liga' : 'Crear liga'}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        {mode === 'join' ? (
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Código de liga</label>
            <input className="input-field" placeholder="Ej: AB3X9K" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} style={{ marginBottom: '1rem', letterSpacing: '0.1em', fontFamily: 'DM Mono, monospace' }} maxLength={6} />
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleJoin} disabled={loading || inputCode.length < 4}>{loading ? 'Buscando...' : 'Unirme →'}</button>
          </div>
        ) : (
          <div>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>Nombre de la liga</label>
            <input className="input-field" placeholder="Ej: Los Puteros del Domingo" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} style={{ marginBottom: '1rem' }} maxLength={40} />
            <button className="btn-primary" style={{ width: '100%' }} onClick={handleCreate} disabled={loading}>{loading ? 'Creando...' : 'Crear liga 🏆'}</button>
          </div>
        )}
        {error && <p style={{ color: '#e57373', fontSize: '0.82rem', marginTop: '0.75rem' }}>{error}</p>}
      </div>
    </div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, fontFamily: 'Playfair Display, serif' }}>{league?.name || 'Mi Liga'}</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>{league?.members?.length} participantes</p>
      </div>

      {league && (
        <div className="card animate-fade-up" style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', animationDelay: '0.05s', opacity: 0, borderColor: 'rgba(201,168,76,0.2)' }}>
          <div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>Código de invitación</p>
            <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.15em', fontFamily: 'DM Mono, monospace' }}>{league.code}</span>
          </div>
          <button className="btn-secondary" onClick={copyCode} style={{ padding: '0.5rem 1rem' }}>{copied ? '✓ Copiado' : '📋 Copiar'}</button>
        </div>
      )}

      <div className="card animate-fade-up" style={{ padding: '1.25rem', animationDelay: '0.1s', opacity: 0 }}>
        <h2 style={{ fontWeight: 600, marginBottom: '1rem', fontSize: '1rem' }}>
          Clasificación
          {tournament && <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.82rem', marginLeft: '0.5rem' }}>· {tournament.name}</span>}
        </h2>
        {!tournament ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Esperando torneo activo...</p>
        : scores.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Aún no hay puntuaciones.</p>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {scores.map((s, i) => (
              <div key={s.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 0.9rem', background: s.uid === user?.uid ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${s.uid === user?.uid ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                <div className={`pos-badge ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : 'pos-other'}`}>{i + 1}</div>
                {s.photoURL && <img src={s.photoURL} alt={s.displayName} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, fontSize: '0.9rem' }}>{s.displayName?.split(' ')[0]}{s.uid === user?.uid && <span style={{ color: 'var(--gold)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>tú</span>}</p>
                </div>
                <span style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'DM Mono, monospace', color: s.totalPoints >= 0 ? 'var(--gold)' : '#e57373' }}>{s.totalPoints > 0 ? '+' : ''}{s.totalPoints}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
