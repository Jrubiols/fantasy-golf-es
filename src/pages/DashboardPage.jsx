import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { subscribeToActiveTournament, getPicks, getLeague } from '../services/firestoreService'
import { fetchTournamentScoreboard, parseLeaderboard, TOURS } from '../services/espnApi'
import { calculatePlayerPoints } from '../utils/scoring'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [tournament, setTournament] = useState(null)
  const [myPicks, setMyPicks] = useState(null)
  const [myPlayers, setMyPlayers] = useState([])
  const [league, setLeague] = useState(null)
  const [loadingTournament, setLoadingTournament] = useState(true)
  const [loadingPicks, setLoadingPicks] = useState(true)

  useEffect(() => {
    const unsub = subscribeToActiveTournament((t) => { setTournament(t); setLoadingTournament(false) })
    return unsub
  }, [])

  useEffect(() => {
    if (profile?.leagueId) getLeague(profile.leagueId).then(setLeague)
  }, [profile])

  useEffect(() => {
    if (!user || !profile?.leagueId || !tournament) { setLoadingPicks(false); return }
    getPicks(user.uid, profile.leagueId, tournament.id).then((picks) => { setMyPicks(picks); setLoadingPicks(false) })
  }, [user, profile, tournament])

  useEffect(() => {
    if (!tournament || !myPicks?.playerIds?.length) return
    fetchTournamentScoreboard(tournament.tour || TOURS.PGA)
      .then((data) => {
        const all = parseLeaderboard(data)
        setMyPlayers(myPicks.playerIds.map((id) => all.find((p) => p.id === id)).filter(Boolean))
      }).catch(console.error)
  }, [tournament, myPicks])

  const totalPoints = myPlayers.reduce((sum, p) => sum + calculatePlayerPoints(p), 0)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6">
      <div className="animate-fade-up" style={{ marginBottom: '2rem' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '0.25rem' }}>Bienvenido de nuevo</p>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--cream)', fontFamily: 'Playfair Display, serif' }}>{user?.displayName?.split(' ')[0]}</h1>
      </div>

      {/* Torneo */}
      {loadingTournament ? <div className="card skeleton" style={{ height: 100 }} /> : !tournament ? (
        <div className="card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay torneo activo en este momento</p>
        </div>
      ) : (
        <div className="card animate-fade-up" style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderColor: 'rgba(201,168,76,0.3)', animationDelay: '0.05s', opacity: 0 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{ background: tournament.status === 'in' ? '#2d7a4f' : 'rgba(255,255,255,0.1)', color: tournament.status === 'in' ? '#a8f0c6' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 20, textTransform: 'uppercase' }}>
                {tournament.status === 'in' ? '🔴 En juego' : tournament.status === 'pre' ? 'Próximamente' : 'Finalizado'}
              </span>
              {tournament.round && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Ronda {tournament.round}</span>}
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--cream)', fontFamily: 'Playfair Display, serif' }}>{tournament.name}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '0.15rem' }}>{tournament.venue}{tournament.city ? ` · ${tournament.city}` : ''}</p>
          </div>
          <span style={{ fontSize: '1.8rem' }}>🏌️</span>
        </div>
      )}

      <div style={{ display: 'grid', gap: '1.25rem', marginTop: '1.25rem' }} className="md:grid-cols-2">
        {/* Mi Equipo */}
        <div className="card animate-fade-up" style={{ padding: '1.25rem', animationDelay: '0.1s', opacity: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>Mi Equipo</h3>
            {myPicks && <span style={{ color: totalPoints >= 0 ? 'var(--green-light)' : '#e57373', fontWeight: 700, fontSize: '1.1rem', fontFamily: 'DM Mono, monospace' }}>{totalPoints > 0 ? '+' : ''}{totalPoints} pts</span>}
          </div>
          {loadingPicks ? <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 44 }} />)}</div>
          : !tournament ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Esperando el próximo torneo...</p>
          : !myPicks ? (
            <div style={{ textAlign: 'center', paddingTop: '1rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>Aún no has elegido tu equipo</p>
              <button className="btn-primary" onClick={() => navigate('/draft')}>Elegir jugadores ⛳</button>
            </div>
          ) : myPlayers.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando datos del torneo...</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {myPlayers.map((p) => {
                const pts = calculatePlayerPoints(p)
                return (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', minWidth: 28 }}>{p.positionDisplay}</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontFamily: 'DM Mono, monospace', color: p.totalScoreValue < 0 ? 'var(--green-light)' : p.totalScoreValue > 0 ? '#e57373' : 'var(--text-primary)' }}>{p.totalScore}</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'DM Mono, monospace', color: pts >= 0 ? 'var(--gold)' : '#e57373', minWidth: 40, textAlign: 'right' }}>{pts > 0 ? '+' : ''}{pts}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Mi Liga */}
        <div className="card animate-fade-up" style={{ padding: '1.25rem', animationDelay: '0.15s', opacity: 0 }}>
          <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Mi Liga</h3>
          {!profile?.leagueId ? (
            <div style={{ textAlign: 'center', paddingTop: '0.5rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>No perteneces a ninguna liga todavía</p>
              <button className="btn-primary" onClick={() => navigate('/league')} style={{ width: '100%' }}>Crear o unirse a una liga</button>
            </div>
          ) : !league ? <div className="skeleton" style={{ height: 80 }} />
          : (
            <div>
              <div style={{ padding: '1rem', background: 'rgba(201,168,76,0.07)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.15)', marginBottom: '1rem' }}>
                <p style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--gold)', fontFamily: 'Playfair Display, serif' }}>{league.name}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem' }}>{league.members?.length} participantes</p>
                <p style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>Código: <span style={{ color: 'var(--cream)', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{league.code}</span></p>
              </div>
              <button className="btn-secondary" style={{ width: '100%' }} onClick={() => navigate('/league')}>Ver clasificación →</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
