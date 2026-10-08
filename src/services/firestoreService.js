import { collection, doc, getDoc, getDocs, setDoc, updateDoc, query, where, orderBy, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { nanoid } from 'nanoid'

export async function createLeague(uid, leagueName) {
  const code = nanoid(6).toUpperCase()
  const leagueRef = doc(collection(db, 'leagues'))
  await setDoc(leagueRef, { id: leagueRef.id, name: leagueName, code, adminUid: uid, members: [uid], createdAt: serverTimestamp() })
  await updateDoc(doc(db, 'users', uid), { leagueId: leagueRef.id })
  return { id: leagueRef.id, code }
}

export async function joinLeague(uid, code) {
  const q = query(collection(db, 'leagues'), where('code', '==', code.toUpperCase()))
  const snap = await getDocs(q)
  if (snap.empty) throw new Error('Liga no encontrada')
  const leagueDoc = snap.docs[0]
  const leagueData = leagueDoc.data()
  if (leagueData.members.includes(uid)) throw new Error('Ya eres miembro de esta liga')
  await updateDoc(leagueDoc.ref, { members: [...leagueData.members, uid] })
  await updateDoc(doc(db, 'users', uid), { leagueId: leagueDoc.id })
  return leagueData
}

export async function getLeague(leagueId) {
  const snap = await getDoc(doc(db, 'leagues', leagueId))
  return snap.exists() ? snap.data() : null
}

export function subscribeToLeagueScores(leagueId, tournamentId, callback) {
  const q = query(collection(db, 'scores'), where('leagueId', '==', leagueId), where('tournamentId', '==', tournamentId), orderBy('totalPoints', 'desc'))
  return onSnapshot(q, (snap) => callback(snap.docs.map((d) => d.data())))
}

export async function savePicks(uid, leagueId, tournamentId, playerIds) {
  await setDoc(doc(db, 'picks', `${leagueId}_${uid}_${tournamentId}`), { uid, leagueId, tournamentId, playerIds, savedAt: serverTimestamp() })
}

export async function getPicks(uid, leagueId, tournamentId) {
  const snap = await getDoc(doc(db, 'picks', `${leagueId}_${uid}_${tournamentId}`))
  return snap.exists() ? snap.data() : null
}

export async function getActiveTournament() {
  const q = query(collection(db, 'tournaments'), where('active', '==', true))
  const snap = await getDocs(q)
  return snap.empty ? null : snap.docs[0].data()
}

export async function setActiveTournament(tournamentData) {
  const q = query(collection(db, 'tournaments'), where('active', '==', true))
  const snap = await getDocs(q)
  for (const d of snap.docs) await updateDoc(d.ref, { active: false })
  await setDoc(doc(db, 'tournaments', tournamentData.id), { ...tournamentData, active: true, createdAt: serverTimestamp() })
}

export function subscribeToActiveTournament(callback) {
  const q = query(collection(db, 'tournaments'), where('active', '==', true))
  return onSnapshot(q, (snap) => callback(snap.empty ? null : snap.docs[0].data()))
}

export async function cachePlayers(players) {
  await Promise.all(players.map((p) => setDoc(doc(db, 'players', p.id), p, { merge: true })))
}

export async function getAllPlayers() {
  const snap = await getDocs(collection(db, 'players'))
  return snap.docs.map((d) => d.data())
}

export function subscribeToPlayers(callback) {
  return onSnapshot(collection(db, 'players'), (snap) => callback(snap.docs.map((d) => d.data())))
}
