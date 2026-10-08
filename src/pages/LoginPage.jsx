import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/dashboard')
  }, [user, loading, navigate])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, background: 'radial-gradient(circle, rgba(45,122,79,0.25) 0%, transparent 70%)', top: '-100px', left: '-100px', borderRadius: '50%', filter: 'blur(80px)' }} />
      <div style={{ position: 'absolute', width: 400, height: 400, background: 'radial-gradient(circle, rgba(201,168,76,0.12) 0%, transparent 70%)', bottom: '0px', right: '-50px', borderRadius: '50%', filter: 'blur(80px)' }} />

      <div className="card animate-fade-up" style={{ padding: '3rem 2.5rem', maxWidth: 400, width: '90%', textAlign: 'center', position: 'relative' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '0.75rem' }}>⛳</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--cream)', fontFamily: 'Playfair Display, serif', lineHeight: 1.1, marginBottom: '0.5rem' }}>
            Fantasy<br /><span style={{ color: 'var(--gold)' }}>Golf ES</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Elige tu equipo, sigue cada ronda<br />y compite con tus amigos
          </p>
        </div>

        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {['🏆  PGA Tour, DP World Tour y Majors', '👥  Ligas privadas con amigos', '📊  Puntos en tiempo real'].map((f) => (
            <p key={f} style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'left' }}>{f}</p>
          ))}
        </div>

        <button className="btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }} onClick={loginWithGoogle}>
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar con Google
        </button>
        <p style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Al entrar aceptas las condiciones de uso</p>
      </div>
    </div>
  )
}
