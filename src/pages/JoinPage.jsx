import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getDoc, doc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'
import { getLeagueByCode, joinLeague } from '../services/firestoreService'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import Skeleton from '../components/ui/Skeleton'

// Destino del enlace de invitación (/unirse/CODIGO): enseña la liga y une con un toque
export default function JoinPage() {
  const { code } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [invite, setInvite] = useState(undefined)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const found = await getLeagueByCode(code).catch(() => null)
      // Si ya es miembro, directo a la liga
      if (found) {
        const league = await getDoc(doc(db, 'leagues', found.leagueId)).catch(() => null)
        if (league?.exists() && !cancelled) { navigate(`/league/${found.leagueId}`, { replace: true }); return }
      }
      if (!cancelled) setInvite(found)
    }
    load()
    return () => { cancelled = true }
  }, [code, navigate])

  async function handleJoin() {
    setJoining(true)
    setError('')
    try {
      navigate(`/league/${await joinLeague(user.uid, code)}`, { replace: true })
    } catch (err) {
      setError(err.message?.startsWith('Ya estás') || err.message?.startsWith('No existe') ? err.message : 'No se pudo unir. Inténtalo de nuevo.')
      setJoining(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      {invite === undefined ? (
        <Skeleton className="h-80 rounded-[1.8rem]" />
      ) : !invite ? (
        <div className="card"><EmptyState title="Este enlace de invitación no es válido o la liga ya no existe." action={<Link to="/league" className="btn-primary">Ir a mis ligas</Link>} /></div>
      ) : (
        <section className="relative animate-fade-up overflow-hidden rounded-[1.8rem] bg-pine px-6 pt-8 pb-6 text-white">
          <div className="halftone absolute inset-0" />
          <div className="relative">
            <p className="text-xs font-semibold tracking-[0.16em] text-mint uppercase">Te han invitado a</p>
            <h1 className="mt-2 font-display text-[3.6rem] leading-[0.88] font-black uppercase">{invite.name ?? 'Una liga privada'}</h1>
            <p className="mt-4 text-[0.95rem] text-white/80">Compite con tus amigos torneo a torneo: elige 6 golfistas, nombra a tu capitán y suma con cada birdie.</p>
            <button className="mt-7 flex h-15 w-full items-center justify-between rounded-full bg-white pr-2 pl-7 font-display text-[1.4rem] font-extrabold text-pine uppercase transition-transform active:scale-[0.98]" onClick={handleJoin} disabled={joining}>
              {joining ? 'Uniéndote...' : 'Unirme a la liga'}
              <span className="flex size-11 items-center justify-center rounded-full bg-pine text-white"><Icon name="arrow" /></span>
            </button>
            {error && <p className="mt-3 text-sm text-[#ffb4ab]">{error}</p>}
            <p className="mt-4 text-center text-xs text-white/60">Código {code.toUpperCase()}</p>
          </div>
        </section>
      )}
    </div>
  )
}
