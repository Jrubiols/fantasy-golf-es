import { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../services/firebase'

/** Preguntas de «Más o Menos» del torneo: la ronda abierta o en juego, y la última corregida. */
export function useTournamentProps(tournamentId) {
  const [list, setList] = useState(null)
  useEffect(() => {
    if (!tournamentId) return
    return onSnapshot(query(collection(db, 'props'), where('tournamentId', '==', tournamentId)), (snap) => setList(snap.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setList([]))
  }, [tournamentId])
  return useMemo(() => {
    if (!list) return null
    const sorted = [...list].sort((a, b) => b.round - a.round)
    return { current: sorted.find((p) => !p.resolved) ?? null, last: sorted.find((p) => p.resolved) ?? null }
  }, [list])
}

/** Mis respuestas a unas preguntas. */
export function useMyPropPicks(propsId, uid) {
  const [pick, setPick] = useState(undefined)
  useEffect(() => {
    if (!propsId || !uid) return
    return onSnapshot(doc(db, 'propPicks', `${propsId}_${uid}`), (s) => setPick(s.exists() ? s.data() : null), () => setPick(null))
  }, [propsId, uid])
  return pick
}

/** Aciertos de la temporada por jugador: [{ uid, displayName, correct, total }] de más a menos. */
export function usePropStandings(season, memberIds = null) {
  const [results, setResults] = useState(null)
  useEffect(() => {
    if (!season) return
    return onSnapshot(query(collection(db, 'propResults'), where('season', '==', season)), (snap) => setResults(snap.docs.map((d) => d.data())), () => setResults([]))
  }, [season])
  return useMemo(() => {
    if (!results) return null
    const byUid = new Map()
    for (const r of results) {
      if (memberIds && !memberIds.includes(r.uid)) continue
      const row = byUid.get(r.uid) ?? { uid: r.uid, displayName: r.displayName, correct: 0, total: 0 }
      row.correct += r.correct
      row.total += r.total
      byUid.set(r.uid, row)
    }
    return [...byUid.values()].sort((a, b) => b.correct - a.correct || a.total - b.total)
  }, [results, memberIds])
}
