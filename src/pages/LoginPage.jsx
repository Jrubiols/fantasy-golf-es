import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoadingScreen from '../components/ui/LoadingScreen'

const FEATURES = [
  { icon: '🏆', text: 'PGA Tour, DP World Tour y Majors' },
  { icon: '👥', text: 'Ligas privadas con amigos' },
  { icon: '📊', text: 'Puntos en tiempo real' },
]

function GoogleLogo() {
  return (
    <svg className="size-4.5" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

export default function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <LoadingScreen />
  if (user) return <Navigate to="/dashboard" replace />

  async function handleLogin() {
    setError('')
    setSigningIn(true)
    try {
      await loginWithGoogle()
    } catch (err) {
      console.error(err)
      setError('No se pudo iniciar sesión. Inténtalo de nuevo.')
    }
    setSigningIn(false)
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute -top-24 -left-24 size-[500px] rounded-full bg-[radial-gradient(circle,rgb(45_122_79/0.25)_0%,transparent_70%)] blur-[80px]" />
      <div className="pointer-events-none absolute -right-12 bottom-0 size-[400px] rounded-full bg-[radial-gradient(circle,rgb(201_168_76/0.12)_0%,transparent_70%)] blur-[80px]" />

      <div className="card relative w-full max-w-sm animate-fade-up px-8 py-12 text-center">
        <img src="/favicon.svg" alt="" className="mx-auto mb-4 size-16" />
        <h1 className="mb-2 font-display text-4xl leading-tight font-black text-cream">
          Fantasy<br /><span className="text-gold-500">Golf ES</span>
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-muted">
          Elige tu equipo, sigue cada ronda<br />y compite con tus amigos
        </p>

        <ul className="mb-8 flex flex-col gap-2 text-left text-sm text-muted">
          {FEATURES.map((f) => (
            <li key={f.text} className="flex gap-3"><span>{f.icon}</span>{f.text}</li>
          ))}
        </ul>

        <button className="btn-primary w-full" onClick={handleLogin} disabled={signingIn}>
          <GoogleLogo />
          {signingIn ? 'Entrando...' : 'Entrar con Google'}
        </button>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <p className="mt-5 text-xs text-muted">Al entrar aceptas las condiciones de uso</p>
      </div>
    </div>
  )
}
