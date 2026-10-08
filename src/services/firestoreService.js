// Acceso a Firestore desde la web. Lo que escribe el motor (torneos, jugadores, puntos)
// aquí solo se lee; las reglas de firestore.rules impiden escribirlo desde el navegador.
import {
  arrayRemove, arrayUnion, collection, doc, getDoc, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { customAlphabet } from 'nanoid'
import { db } from './firebase'

const toData = (snap) => (snap.exists() ? { id: snap.id, ...snap.data() } : null)
const toList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }))

/** Torneo de la semana: config/current apunta a él y el motor lo mantiene al día. */
export function subscribeCurrentTournament(callback, onError) {
  let unsubTournament = () => {}
  const unsubConfig = onSnapshot(doc(db, 'config', 'current'), (snap) => {
    unsubTournament()
    const id = snap.data()?.tournamentId
    if (!id) { callback(null); return }
    unsubTournament = onSnapshot(doc(db, 'tournaments', id), (t) => callback(toData(t)), onError)
  }, onError)
  return () => { unsubConfig(); unsubTournament() }
}

export function subscribePlayers(tournamentId, callback, onError) {
  return onSnapshot(collection(db, 'tournaments', tournamentId, 'players'), (snap) => callback(toList(snap)), onError)
}

// --- Equipos ---

const picksId = (tournamentId, uid) => `${tournamentId}_${uid}`

export async function getMyPicks(tournamentId, uid) {
  return toData(await getDoc(doc(db, 'picks', picksId(tournamentId, uid))))
}

/** El coste se suma en el mismo orden que lo comprueban las reglas, para que cuadre al céntimo. */
export function savePicks(tournamentId, user, playerIds, captainId, priceById) {
  return setDoc(doc(db, 'picks', picksId(tournamentId, user.uid)), {
    uid: user.uid,
    tournamentId,
    playerIds,
    captainId,
    cost: playerIds.reduce((sum, id) => sum + priceById[id], 0),
    displayName: user.displayName ?? 'Jugador',
    photoURL: user.photoURL ?? null,
    updatedAt: serverTimestamp(),
  })
}

/** Equipos publicados (desde la primera salida), con puntos y puesto. */
export function subscribeEntries(tournamentId, callback, onError) {
  return onSnapshot(query(collection(db, 'entries'), where('tournamentId', '==', tournamentId)), (snap) => callback(toList(snap)), onError)
}

export function subscribeMyEntries(uid, callback, onError) {
  return onSnapshot(query(collection(db, 'entries'), where('uid', '==', uid)), (snap) => callback(toList(snap)), onError)
}

/** Equipos de los torneos ya terminados de una temporada (para los ganadores de cada semana). */
export function subscribeFinalEntries(season, callback, onError) {
  const q = query(collection(db, 'entries'), where('season', '==', season), where('final', '==', true))
  return onSnapshot(q, (snap) => callback(toList(snap)), onError)
}

export function subscribeSeasonStandings(season, callback, onError) {
  return onSnapshot(collection(db, 'seasons', String(season), 'standings'), (snap) => callback(toList(snap)), onError)
}

// --- Ligas ---

// Sin caracteres que se confunden al dictar el código (0/O, 1/I)
const newCode = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6)

export function subscribeMyLeagues(uid, callback, onError) {
  return onSnapshot(query(collection(db, 'leagues'), where('memberIds', 'array-contains', uid)), (snap) => callback(toList(snap)), onError)
}

export function subscribeLeague(leagueId, callback, onError) {
  return onSnapshot(doc(db, 'leagues', leagueId), (snap) => callback(toData(snap)), onError)
}

/** Crea la liga y su código a la vez. Si el código ya existe (muy raro), prueba con otro. */
export async function createLeague(uid, name) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = newCode()
    const leagueRef = doc(collection(db, 'leagues'))
    const batch = writeBatch(db)
    batch.set(leagueRef, { name, code, ownerUid: uid, memberIds: [uid], createdAt: serverTimestamp() })
    batch.set(doc(db, 'leagueCodes', code), { leagueId: leagueRef.id, name })
    try {
      await batch.commit()
      return leagueRef.id
    } catch (err) {
      if (err.code !== 'permission-denied' || attempt === 2) throw err
    }
  }
}

/** Liga a la que lleva un código de invitación: { leagueId, name } o null. */
export async function getLeagueByCode(rawCode) {
  return toData(await getDoc(doc(db, 'leagueCodes', rawCode.trim().toUpperCase())))
}

/** Las ligas anteriores al enlace de invitación no guardaban su nombre junto al código: se completa. */
export async function backfillInviteName(league) {
  const invite = await getLeagueByCode(league.code)
  if (invite && invite.name !== league.name) await updateDoc(doc(db, 'leagueCodes', league.code), { name: league.name })
}

/** Enlace de invitación: abre la app y une a la liga con un toque. */
export const inviteLink = (code) => `${window.location.origin}/unirse/${code}`

export async function joinLeague(uid, rawCode) {
  const invite = await getLeagueByCode(rawCode)
  if (!invite) throw new Error('No existe ninguna liga con ese código')
  const { leagueId } = invite
  try {
    await updateDoc(doc(db, 'leagues', leagueId), { memberIds: arrayUnion(uid) })
  } catch (err) {
    // Las reglas rechazan unirse dos veces o pasar de 50 miembros
    if (err.code === 'permission-denied') throw new Error('Ya estás en esta liga o está completa')
    throw err
  }
  return leagueId
}

export function leaveLeague(uid, leagueId) {
  return updateDoc(doc(db, 'leagues', leagueId), { memberIds: arrayRemove(uid) })
}

export function renameLeague(league, name) {
  const batch = writeBatch(db)
  batch.update(doc(db, 'leagues', league.id), { name })
  batch.update(doc(db, 'leagueCodes', league.code), { name })
  return batch.commit()
}

/** Borra la liga y su código (solo el creador). */
export function deleteLeague(league) {
  const batch = writeBatch(db)
  batch.delete(doc(db, 'leagueCodes', league.code))
  batch.delete(doc(db, 'leagues', league.id))
  return batch.commit()
}
