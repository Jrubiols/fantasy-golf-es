import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { useAuth } from '../hooks/useAuth'
import { CLUB_COLORS, clubColor } from '../lib/clubs'
import PageHeader from '../components/ui/PageHeader'
import ClubCard from '../components/ui/ClubCard'
import Icon from '../components/ui/Icon'

export default function ProfilePage() {
  const { user, profile, logout } = useAuth()
  const navigate = useNavigate()
  const current = clubColor(profile?.color, user.uid)
  const [color, setColor] = useState(current.id)
  const [clubName, setClubName] = useState(profile?.clubName ?? '')
  const [status, setStatus] = useState(null)
  const [saving, setSaving] = useState(false)

  const dirty = color !== current.id || clubName.trim() !== (profile?.clubName ?? '')

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setStatus(null)
    try {
      await updateDoc(doc(db, 'users', user.uid), { color, clubName: clubName.trim() || null })
      setStatus({ ok: true, text: 'Guardado. Tu club ya luce así en todas las clasificaciones.' })
    } catch (err) {
      console.error(err)
      setStatus({ ok: false, text: 'No se pudo guardar. Inténtalo de nuevo.' })
    }
    setSaving(false)
  }

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pt-4">
      <PageHeader eyebrow="Tu perfil" title="Mi club" subtitle="Elige el color y el nombre con el que apareces en las ligas" />

      <ClubCard color={color} uid={user.uid} rank={1} title={clubName.trim() || profile?.displayName || user.displayName} subtitle={profile?.displayName ?? user.displayName} points={0} className="animate-fade-up" />

      <form onSubmit={handleSave} className="card mt-5 animate-fade-up p-5 [animation-delay:80ms]">
        <label htmlFor="club-name" className="label mb-2 block">Nombre del club</label>
        <input id="club-name" className="input-field bg-bg" placeholder="Ej: Birdie Hunters GC" value={clubName} onChange={(e) => setClubName(e.target.value)} maxLength={30} />

        <p className="label mt-6 mb-3">Color</p>
        <div className="grid grid-cols-4 gap-3">
          {CLUB_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              aria-pressed={color === c.id}
              aria-label={c.name}
              className={`relative flex h-16 items-end rounded-2xl p-2 text-left text-xs font-semibold text-white transition-transform active:scale-95 ${color === c.id ? 'ring-[3px] ring-ink/80 ring-offset-2 ring-offset-surface' : ''}`}
              style={{ background: c.bg }}
            >
              {c.name}
              {color === c.id && <Icon name="check" className="absolute top-2 right-2 size-4" strokeWidth={3} />}
            </button>
          ))}
        </div>

        <button type="submit" className="btn-primary mt-6 w-full" disabled={!dirty || saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        {status && <p role="status" className={`mt-3 text-sm ${status.ok ? 'text-under' : 'text-over'}`}>{status.text}</p>}
      </form>

      <div className="mt-8 flex justify-center">
        <button className="btn-ghost" onClick={handleLogout}><Icon name="logout" className="size-4" />Cerrar sesión</button>
      </div>
    </div>
  )
}
