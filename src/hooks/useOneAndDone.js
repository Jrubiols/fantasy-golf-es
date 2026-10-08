import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '../services/firebase'

const money = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 })
export const formatMoney = (n) => money.format(n ?? 0)

/** Resultados de «Sin repetir» de una temporada (todos los jugadores). */
export function useOadResults(season) {
  const [results, setResults] = useState(null)
  useEffect(() => {
    if (!season) return
    return onSnapshot(query(collection(db, 'oadResults'), where('season', '==', season)), (snap) => setResults(snap.docs.map((d) => d.data())), () => setResults([]))
  }, [season])
  return results
}

/** Clasificación: dinero acumulado por jugador (los golfistas repetidos no suman). */
export function oadStandings(results, memberIds = null) {
  const byUid = new Map()
  for (const r of results ?? []) {
    if (memberIds && !memberIds.includes(r.uid)) continue
    const row = byUid.get(r.uid) ?? { uid: r.uid, displayName: r.displayName, earnings: 0, played: 0 }
    row.earnings += r.earnings ?? 0
    row.played++
    byUid.set(r.uid, row)
  }
  return [...byUid.values()].sort((a, b) => b.earnings - a.earnings)
}
