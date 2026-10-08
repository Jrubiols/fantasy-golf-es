import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { createLeague, joinLeague, getLeague, subscribeToLeagueScores, subscribeToActiveTournament } from '../services/firestoreService'
import PageHeader from '../components/ui/PageHeader'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'
import StandingsList from '../components/ui/StandingsList'

const MODES = [
  { id: 'join', label: 'Unirse a una liga' },
  { id: 'create', label: 'Crear liga' },
]

function JoinOrCreate({ uid, onDone }) {
  const [mode, setMode] = useState('join')
  const [inputCode, setInputCode] = useState('')
  const [leagueName, setLeagueName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function run(action) {
    setError('')
    setLoading(true)
    try {
      onDone(await action())
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (mode === 'join') return run(() => joinLeague(uid, inputCode))
    if (!leagueName.trim()) { setError('Pon un nombre a tu liga'); return }
    return run(() => createLeague(uid, leagueName.trim()))
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PageHeader title="Ligas" subtitle="Compite con tus amigos en una liga privada" />

      <div className="mb-6 flex rounded-xl bg-white/6 p-1" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.id}
            role="tab"
            aria-selected={mode === m.id}
            onClick={() => { setMode(m.id); setError('') }}
            className={`flex-1 rounded-lg py-2 text-sm transition-all ${mode === m.id ? 'bg-pine-900 font-semibold text-cream' : 'text-muted'}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <form className="card p-6" onSubmit={handleSubmit}>
        {mode === 'join' ? (
          <>
            <label htmlFor="league-code" className="mb-2 block text-sm text-muted">Código de liga</label>
            <input id="league-code" className="input-field mb-4 font-mono tracking-widest" placeholder="Ej: AB3X9K" value={inputCode} onChange={(e) => setInputCode(e.target.value.toUpperCase())} maxLength={6} autoComplete="off" />
            <button type="submit" className="btn-primary w-full" disabled={loading || inputCode.length < 4}>{loading ? 'Buscando...' : 'Unirme →'}</button>
          </>
        ) : (
          <>
            <label htmlFor="league-name" className="mb-2 block text-sm text-muted">Nombre de la liga</label>
            <input id="league-name" className="input-field mb-4" placeholder="Ej: Liga del Domingo" value={leagueName} onChange={(e) => setLeagueName(e.target.value)} maxLength={40} />
            <button type="submit" className="btn-primary w-full" disabled={loading}>{loading ? 'Creando...' : 'Crear liga 🏆'}</button>
          </>
        )}
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
      </form>
    </div>
  )
}

export default function LeaguePage() {
  const { user, profile } = useAuth()
  const [league, setLeague] = useState(null)
  const [scores, setScores] = useState([])
  const [tournament, setTournament] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => subscribeToActiveTournament(setTournament), [])

  useEffect(() => {
    if (profile?.leagueId) getLeague(profile.leagueId).then(setLeague)
  }, [profile?.leagueId])

  useEffect(() => {
    if (!league || !tournament) return
    return subscribeToLeagueScores(league.id, tournament.id, setScores)
  }, [league, tournament])

  async function copyCode() {
    await navigator.clipboard.writeText(league.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Tras crear o unirse, cargamos la liga con el id devuelto (el perfil tarda en actualizarse)
  async function handleJoined({ id }) {
    setLeague(await getLeague(id))
  }

  if (!profile?.leagueId && !league) return <JoinOrCreate uid={user.uid} onDone={handleJoined} />

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <PageHeader title={league?.name || 'Mi Liga'} subtitle={league ? `${league.members?.length} participantes` : undefined} />

      {league && (
        <section className="card mb-5 flex animate-fade-up items-center justify-between border-gold-500/20 px-5 py-4 [animation-delay:50ms]">
          <div>
            <p className="mb-0.5 text-xs text-muted">Código de invitación</p>
            <span className="font-mono text-2xl font-bold tracking-[0.15em] text-gold-500">{league.code}</span>
          </div>
          <button className="btn-secondary btn-sm" onClick={copyCode}>
            <Icon name={copied ? 'check' : 'copy'} className="size-4" />
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </section>
      )}

      <section className="card animate-fade-up p-5 [animation-delay:100ms]">
        <h2 className="mb-4 font-semibold">
          Clasificación
          {tournament && <span className="ml-2 text-sm font-normal text-muted">· {tournament.name}</span>}
        </h2>
        {!tournament ? (
          <EmptyState title="Esperando torneo activo..." />
        ) : scores.length === 0 ? (
          <EmptyState title="Aún no hay puntuaciones." />
        ) : (
          <StandingsList scores={scores} currentUid={user?.uid} shortNames />
        )}
      </section>
    </div>
  )
}
