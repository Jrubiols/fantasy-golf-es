import { useState, useEffect } from 'react'
import { fetchTournamentScoreboard, parseLeaderboard, parseActiveTournament, TOURS } from '../../services/espnApi'
import { setActiveTournament, cachePlayers, getActiveTournament } from '../../services/firestoreService'
import { playerValue } from '../../utils/scoring'
import PageHeader from '../../components/ui/PageHeader'

function StatusMessage({ status }) {
  if (!status) return null
  const isError = status.type === 'error'
  return (
    <div role="status" className={`mt-4 rounded-lg border px-4 py-3 text-sm ${isError ? 'border-danger/30 bg-danger/10 text-danger' : 'border-pine-400/30 bg-pine-400/10 text-pine-400'}`}>
      {status.text}
    </div>
  )
}

export default function AdminPage() {
  const [tour, setTour] = useState(TOURS.PGA)
  const [preview, setPreview] = useState(null)
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeTournament, setActiveTournamentState] = useState(null)
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getActiveTournament().then(setActiveTournamentState)
  }, [])

  async function handleFetchPreview() {
    setLoading(true)
    setStatus(null)
    try {
      const data = await fetchTournamentScoreboard(tour)
      const parsed = parseLeaderboard(data)
      setPreview(parseActiveTournament(data))
      setPlayers(parsed)
      setStatus({ type: 'ok', text: `✓ ${parsed.length} jugadores cargados desde ESPN` })
    } catch (err) {
      setStatus({ type: 'error', text: `Error: ${err.message}` })
    }
    setLoading(false)
  }

  async function handleActivate() {
    if (!preview) return
    setLoading(true)
    try {
      await setActiveTournament({ ...preview, tour })
      await cachePlayers(players.map((p) => ({ id: p.id, name: p.name, shortName: p.shortName, country: p.country, photoURL: p.photoURL, owgr: p.owgr || null, value: playerValue(p.owgr) })))
      setActiveTournamentState({ ...preview, tour })
      setStatus({ type: 'ok', text: '✓ Torneo activado y jugadores guardados' })
    } catch (err) {
      setStatus({ type: 'error', text: `Error: ${err.message}` })
    }
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <PageHeader title="Panel de Admin" subtitle="Solo visible para administradores" />

      {activeTournament && (
        <section className="card mb-5 border-pine-400/30 px-5 py-4">
          <p className="mb-1 text-xs font-semibold tracking-wide text-pine-400">TORNEO ACTIVO ACTUAL</p>
          <p className="font-semibold">{activeTournament.name}</p>
          <p className="text-sm text-muted">Tour: {activeTournament.tour?.toUpperCase()} · ID: {activeTournament.id}</p>
        </section>
      )}

      <section className="card mb-5 p-6">
        <h2 className="mb-4 font-semibold">1. Seleccionar tour</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(TOURS).map(([key, val]) => (
            <button
              key={val}
              onClick={() => setTour(val)}
              aria-pressed={tour === val}
              className={`rounded-lg border px-4 py-2 text-sm transition-colors ${tour === val ? 'border-gold-500 bg-gold-500/12 font-semibold text-gold-500' : 'border-white/15 text-muted hover:text-cream'}`}
            >
              {key}
            </button>
          ))}
        </div>
        <button className="btn-primary" onClick={handleFetchPreview} disabled={loading}>
          {loading ? 'Cargando ESPN...' : 'Obtener torneo actual de ESPN →'}
        </button>
      </section>

      {preview && (
        <section className="card mb-5 p-6">
          <h2 className="mb-4 font-semibold">2. Revisar y activar</h2>
          <div className="mb-4 rounded-lg bg-white/4 p-4 text-sm">
            <p className="mb-1 text-base font-semibold">{preview.name}</p>
            <p className="text-muted">{preview.venue}{preview.city ? ` · ${preview.city}` : ''}</p>
            <p className="text-muted">Estado: {preview.statusDisplay || preview.status} · ID: {preview.id}</p>
            <p className="mt-2 text-gold-500">{players.length} jugadores disponibles</p>
          </div>
          <button className="btn-primary" onClick={handleActivate} disabled={loading}>
            {loading ? 'Activando...' : '⚡ Activar este torneo y guardar jugadores'}
          </button>
        </section>
      )}

      {players.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-4 font-semibold">Jugadores cargados ({players.length})</h2>
          <ol className="flex max-h-100 flex-col gap-1.5 overflow-y-auto">
            {players.slice(0, 60).map((p, i) => (
              <li key={p.id ?? i} className="flex justify-between rounded-md bg-white/3 px-3 py-2 text-sm">
                <div className="flex items-center gap-2.5">
                  <span className="min-w-6 font-mono text-muted">{i + 1}</span>
                  <span>{p.name}</span>
                  <span className="text-muted">{p.country}</span>
                </div>
                <span className="font-mono text-gold-500">{playerValue(p.owgr)}M</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <StatusMessage status={status} />
    </div>
  )
}
