import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { disablePush, enablePush, isIOS, isStandalone, pushAvailable, pushEnabled } from '../../services/notifications'
import Icon from './Icon'

/**
 * Activar los avisos en este dispositivo. `compact` es la versión de Inicio: solo aparece
 * si se pueden activar y aún no están activos, y se puede descartar.
 */
export default function PushCard({ compact = false }) {
  const { user } = useAuth()
  const [state, setState] = useState('loading') // loading · unsupported · ios · denied · off · on
  const [busy, setBusy] = useState(false)
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('fg-push-dismissed') === '1' } catch { return false }
  })

  useEffect(() => {
    pushAvailable().then((ok) => {
      if (!ok) setState(isIOS() && !isStandalone() ? 'ios' : 'unsupported')
      else if (Notification.permission === 'denied') setState('denied')
      else setState(pushEnabled() ? 'on' : 'off')
    })
  }, [])

  async function turnOn() {
    setBusy(true)
    try {
      setState((await enablePush(user.uid)) ? 'on' : Notification.permission === 'denied' ? 'denied' : 'off')
    } catch (err) {
      console.error('No se pudieron activar los avisos:', err)
    }
    setBusy(false)
  }

  async function turnOff() {
    setBusy(true)
    await disablePush(user.uid)
    setState('off')
    setBusy(false)
  }

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem('fg-push-dismissed', '1') } catch { /* solo esta sesión */ }
  }

  // Sin la clave de Web Push configurada, los avisos aún no están disponibles en esta web
  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) return null

  if (compact) {
    if (state !== 'off' || dismissed) return null
    return (
      <section className="relative mb-5 flex animate-fade-up items-center gap-3 overflow-hidden rounded-[1.6rem] bg-navy p-4 pr-3 text-white">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-mint text-pine-dark"><Icon name="bell" /></span>
        <p className="flex-1 text-sm leading-snug">Activa los avisos y te recordamos el cierre de equipos y tu resultado.</p>
        <button className="h-10 shrink-0 rounded-full bg-white px-4 font-display text-base font-extrabold text-navy uppercase" onClick={turnOn} disabled={busy}>{busy ? '...' : 'Activar'}</button>
        <button className="shrink-0 p-1 text-white/60 hover:text-white" onClick={dismiss} aria-label="Ahora no"><Icon name="close" className="size-4" /></button>
      </section>
    )
  }

  return (
    <section className="card p-5">
      <div className="flex items-center gap-3">
        <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${state === 'on' ? 'bg-pine text-white' : 'bg-track text-pine'}`}><Icon name="bell" /></span>
        <div className="flex-1">
          <h2 className="headline text-[1.5rem]">Avisos</h2>
          <p className="text-sm text-muted">
            {state === 'on' && 'Activados en este dispositivo.'}
            {state === 'off' && 'Te avisamos cuando abra el mercado, 3 horas antes del cierre y con tu resultado.'}
            {state === 'denied' && 'Los has bloqueado. Actívalos en los ajustes del navegador para esta web.'}
            {state === 'ios' && 'En iPhone, primero añade la app a la pantalla de inicio: botón Compartir → «Añadir a pantalla de inicio». Luego ábrela desde ahí y vuelve aquí.'}
            {state === 'unsupported' && 'Este navegador no permite avisos. Prueba con Chrome, Edge o Safari en la app instalada.'}
            {state === 'loading' && '…'}
          </p>
        </div>
      </div>
      {state === 'off' && <button className="btn-primary mt-4 w-full" onClick={turnOn} disabled={busy}>{busy ? 'Activando...' : 'Activar avisos'}</button>}
      {state === 'on' && <button className="btn-ghost mt-4 w-full" onClick={turnOff} disabled={busy}>Desactivar en este dispositivo</button>}
    </section>
  )
}
