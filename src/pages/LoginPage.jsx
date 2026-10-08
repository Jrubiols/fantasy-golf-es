import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { sizedPhoto } from '../utils/format'
import Icon from '../components/ui/Icon'
import LoadingScreen from '../components/ui/LoadingScreen'
import Wordmark from '../components/ui/Wordmark'

const ESPN = 'https://a.espncdn.com/i/headshots/golf/players/full'
// Tres caras conocidas del circuito para la portada
const HERO = [
  { id: 9780, name: 'Jon Rahm', className: '-left-10 w-[58%] sm:w-64' },
  { id: 3470, name: 'Rory McIlroy', className: '-right-10 w-[58%] sm:w-64' },
  { id: 9478, name: 'Scottie Scheffler', className: 'left-1/2 w-[74%] -translate-x-1/2 sm:w-80' },
]

export default function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth()
  const location = useLocation()
  const [signingIn, setSigningIn] = useState(false)
  const [error, setError] = useState('')

  if (loading) return <LoadingScreen />
  // Vuelve a donde quería ir (por ejemplo, un enlace de invitación a una liga)
  if (user) return <Navigate to={location.state?.from ?? '/dashboard'} replace />

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <Wordmark size="md" className="mx-auto animate-fade-in" />

      <section className="relative mt-6 h-[min(56vh,27rem)] animate-fade-up overflow-hidden rounded-[1.8rem] bg-pine">
        <div className="halftone absolute inset-0" />
        <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-pine-mid" />
        <div className="absolute -right-12 -bottom-40 size-80 rounded-full bg-pine-light" />
        <div className="relative px-6 pt-7">
          <p className="text-xs font-semibold tracking-[0.16em] text-mint">TEMPORADA {new Date().getFullYear()} · PGA TOUR</p>
          <h1 className="mt-2.5 font-display text-[4.3rem] leading-[0.86] font-black text-white uppercase">Cada birdie<br />cuenta.</h1>
        </div>
        {HERO.map((p, i) => (
          <img
            key={p.id}
            src={sizedPhoto(`${ESPN}/${p.id}.png`, 600)}
            alt={p.name}
            className={`absolute bottom-0 max-w-none animate-fade-up ${p.className}`}
            style={{ animationDelay: `${150 + i * 120}ms` }}
          />
        ))}
      </section>

      <p className="mt-5 px-2 text-[0.95rem] leading-relaxed text-muted">
        Elige 6 golfistas con 100M, nombra a tu capitán y gana a tus amigos en tu liga privada. Puntos en directo con cada golpe.
      </p>

      <div className="mt-auto pt-6">
        <button className="btn-primary btn-lg w-full justify-between pr-2 pl-7" onClick={handleLogin} disabled={signingIn}>
          {signingIn ? 'Entrando...' : 'Entrar con Google'}
          <span className="flex size-11 items-center justify-center rounded-full bg-white text-pine"><Icon name="arrow" /></span>
        </button>
        {error && <p className="mt-3 text-center text-sm text-over">{error}</p>}
        <p className="mt-4 text-center text-xs text-faint">Gratis · Sin anuncios · Ligas privadas</p>
      </div>
    </div>
  )
}
