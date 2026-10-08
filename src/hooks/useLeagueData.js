import { useEffect, useMemo, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../services/firebase'
import { subscribeEntries, subscribeSeasonStandings } from '../services/firestoreService'

/** Perfiles públicos (nombre y foto) de una lista de usuarios. */
export function useProfiles(uids) {
  const [profiles, setProfiles] = useState({})
  const key = [...(uids ?? [])].sort().join()
  useEffect(() => {
    if (!key) return
    let cancelled = false
    Promise.all(key.split(',').map(async (uid) => [uid, (await getDoc(doc(db, 'users', uid))).data() ?? {}]))
      .then((list) => { if (!cancelled) setProfiles(Object.fromEntries(list)) })
      .catch((err) => console.error('Error cargando perfiles:', err))
    return () => { cancelled = true }
  }, [key])
  return profiles
}

export function useEntries(tournamentId) {
  const [entries, setEntries] = useState(null)
  useEffect(() => {
    if (!tournamentId) return
    return subscribeEntries(tournamentId, setEntries, (err) => { console.error(err); setEntries([]) })
  }, [tournamentId])
  return entries
}

export function useSeasonStandings(season) {
  const [standings, setStandings] = useState(null)
  useEffect(() => {
    if (!season) return
    return subscribeSeasonStandings(season, setStandings, (err) => { console.error(err); setStandings([]) })
  }, [season])
  return standings
}

/** Puesto con empates sobre una lista ya filtrada (p. ej. solo los miembros de una liga). */
export function withRanks(rows) {
  const sorted = [...rows].sort((a, b) => (b.points ?? -Infinity) - (a.points ?? -Infinity))
  let rank = 0
  return sorted.map((row, i) => {
    if (row.points == null) return { ...row, rank: null }
    if (i === 0 || row.points !== sorted[i - 1].points) rank = i + 1
    return { ...row, rank }
  })
}

/**
 * Clasificación de un grupo de usuarios: todos aparecen, aunque no tengan equipo.
 * `source` es una lista con { uid, points, ... } (entradas del torneo o clasificación de la temporada).
 */
export function useGroupStandings(memberIds, source, profiles) {
  return useMemo(() => {
    if (!source) return null
    const byUid = new Map(source.map((s) => [s.uid, s]))
    return withRanks(memberIds.map((uid) => {
      const row = byUid.get(uid)
      const profile = profiles[uid] ?? {}
      return { displayName: profile.displayName ?? 'Jugador', photoURL: profile.photoURL ?? null, ...row, uid, points: row?.points ?? null }
    }))
  }, [memberIds, source, profiles])
}
