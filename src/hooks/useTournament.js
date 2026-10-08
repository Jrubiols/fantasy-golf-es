import { useEffect, useMemo, useState } from 'react'
import { subscribeCurrentTournament, subscribePlayers } from '../services/firestoreService'

/** Torneo de la semana. undefined mientras carga, null si no hay ninguno. */
export function useCurrentTournament() {
  const [tournament, setTournament] = useState(undefined)
  useEffect(() => subscribeCurrentTournament(setTournament, (err) => {
    console.error('Error cargando el torneo:', err)
    setTournament(null)
  }), [])
  return tournament
}

/** Jugadores del torneo y un índice por id. */
export function usePlayers(tournamentId) {
  const [players, setPlayers] = useState(null)
  useEffect(() => {
    if (!tournamentId) return
    return subscribePlayers(tournamentId, setPlayers, (err) => {
      console.error('Error cargando jugadores:', err)
      setPlayers([])
    })
  }, [tournamentId])
  const byId = useMemo(() => Object.fromEntries((players ?? []).map((p) => [p.id, p])), [players])
  return { players, byId, loading: tournamentId != null && players == null }
}

/** ¿Están cerrados los equipos? Se reevalúa cada 30 s para cerrar justo a la hora de salida. */
export function useLocked(tournament) {
  const lockAt = tournament?.firstTeeTime?.toMillis?.()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!lockAt || now >= lockAt) return
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [lockAt, now])
  return { locked: lockAt != null && now >= lockAt, lockAt, now }
}
