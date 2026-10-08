import { useState, useEffect } from 'react'
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore'
import { db } from '../services/firebase'
import { subscribeToActiveTournament } from '../services/firestoreService'
import { useAuth } from '../context/AuthContext'

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [scores, setScores] = useState([])
  const [tournament, setTournament] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeToActiveTournament(setTournament)
    return unsub
  }, [])

  useEffect(() => {
    if (!tournament) return
    const q = query(collection(db, 'scores'), where('tournamentId', '==', tournament.id), orderBy('totalPoints', 'desc'), limit(50))
    getDocs(q).then((snap) => { setScores(snap.docs.map((d) => d.data())); setLoading(false) })
  }, [tournament])

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-24 md:pb-8">
      <div className="animate-fade-up" style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.25rem', fontFamily: 'Playfair Display, serif' }}>Ranking Global</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{tournament ? tournament.name : 'Todos los usuarios de la plataforma'}</p>
      </div>

      {scores.length >= 3 && (
        <div className="animate-fade-up" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '1.5rem', padding: '1.5rem 1rem 0', animationDelay: '0.08s', opacity: 0 }}>
          {[scores[1], scores[0], scores[2]].map((s, i) => {
            const heights = [80, 110, 60]
            const medals = ['🥈', '🥇', '🥉']
            return (
              <div key={s.uid} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: i === 1 ? 1.2 : 1 }}>
                {s.photoURL ? <img src={s.photoURL} alt={s.displayName} style={{ width: i === 1 ? 52 : 40, height: i === 1 ? 52 : 40, borderRadius: '50%', objectFit: 'cover', border: `2px solid ${i === 1 ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}` }} />
                  : <div style={{ width: i === 1 ? 52 : 40, height: i === 1 ? 52 : 40, borderRadius: '50%', background: 'var(--green-mid)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: i === 1 ? '1.2rem' : '1rem', border: `2px solid ${i === 1 ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}` }}>{s.displayName?.[0]}</div>}
                <span style={{ fontSize: i === 1 ? '1.2rem' : '1rem' }}>{medals[i]}</span>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, textAlign: 'center', maxWidth: 80 }}>{s.displayName?.split(' ')[0]}</p>
                <div style={{ width: '100%', height: heights[i], background: i === 1 ? 'linear-gradient(135deg, var(--gold), var(--gold-light))' : 'rgba(255,255,255,0.08)', borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', fontFamily: 'DM Mono, monospace', color: i === 1 ? 'var(--green-deep)' : 'var(--text-primary)' }}>{s.totalPoints > 0 ? '+' : ''}{s.totalPoints}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card animate-fade-up" style={{ padding: '1.25rem', animationDelay: '0.15s', opacity: 0 }}>
        {loading ? <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: 52 }} />)}</div>
        : scores.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>Aún no hay puntuaciones para este torneo.</p>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {scores.map((s, i) => (
              <div key={s.uid} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.9rem', background: s.uid === user?.uid ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.03)', borderRadius: '8px', border: `1px solid ${s.uid === user?.uid ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                <div className={`pos-badge ${i === 0 ? 'pos-1' : i === 1 ? 'pos-2' : i === 2 ? 'pos-3' : 'pos-other'}`}>{i + 1}</div>
                {s.photoURL && <img src={s.photoURL} alt={s.displayName} style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 500, fontSize: '0.88rem' }}>{s.displayName}{s.uid === user?.uid && <span style={{ color: 'var(--gold)', fontSize: '0.7rem', marginLeft: '0.4rem' }}>tú</span>}</p>
                </div>
                <span style={{ fontWeight: 700, fontFamily: 'DM Mono, monospace', color: s.totalPoints >= 0 ? 'var(--gold)' : '#e57373' }}>{s.totalPoints > 0 ? '+' : ''}{s.totalPoints}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
