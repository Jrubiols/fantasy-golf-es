// Pruebas de las reglas de Firestore contra el emulador: npm run test:rules
import { readFileSync } from 'node:fs'
import { after, before, beforeEach, describe, test } from 'node:test'
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing'
import {
  arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch,
} from 'firebase/firestore'

const TID = 't1'
const PRICES = { p1: 25, p2: 20, p3: 15, p4: 12, p5: 10, p6: 8, p7: 30 }
const TEAM = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']
const cost = (ids) => ids.reduce((sum, id) => sum + PRICES[id], 0)

let env

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-fantasy-golf',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

after(() => env.cleanup())

async function seed({ lockInMinutes = 60 } = {}) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'tournaments', TID), { name: 'Test Open', firstTeeTime: Timestamp.fromMillis(Date.now() + lockInMinutes * 60_000) })
    for (const [id, price] of Object.entries(PRICES)) await setDoc(doc(db, 'tournaments', TID, 'players', id), { name: id, price })
  })
}

beforeEach(async () => {
  await env.clearFirestore()
  await seed()
})

const as = (uid) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()

const picks = (uid, overrides = {}) => ({
  uid,
  tournamentId: TID,
  playerIds: TEAM,
  captainId: 'p1',
  cost: cost(TEAM),
  displayName: uid,
  photoURL: null,
  updatedAt: serverTimestamp(),
  ...overrides,
})

describe('perfiles', () => {
  const profile = { displayName: 'Ana', photoURL: null, isAdmin: false, createdAt: serverTimestamp() }

  test('cada uno crea su perfil', () => assertSucceeds(setDoc(doc(as('ana'), 'users/ana'), profile)))
  test('nadie se crea como admin', () => assertFails(setDoc(doc(as('ana'), 'users/ana'), { ...profile, isAdmin: true })))
  test('no se crea el perfil de otro', () => assertFails(setDoc(doc(as('ana'), 'users/bea'), profile)))
  test('nadie se hace admin después', async () => {
    await setDoc(doc(as('ana'), 'users/ana'), profile)
    await assertFails(updateDoc(doc(as('ana'), 'users/ana'), { isAdmin: true }))
    await assertSucceeds(updateDoc(doc(as('ana'), 'users/ana'), { displayName: 'Ana G.' }))
  })
  test('color y nombre de club: solo colores de la lista', async () => {
    await setDoc(doc(as('ana'), 'users/ana'), profile)
    await assertSucceeds(updateDoc(doc(as('ana'), 'users/ana'), { color: 'granate', clubName: 'Birdie Hunters' }))
    await assertFails(updateDoc(doc(as('ana'), 'users/ana'), { color: 'fucsia' }))
    await assertFails(updateDoc(doc(as('ana'), 'users/ana'), { clubName: 'x'.repeat(31) }))
  })
  test('los perfiles antiguos pueden borrar el email, pero nadie lo añade', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'users/ana'), { ...profile, uid: 'ana', email: 'ana@example.com' }))
    await assertFails(updateDoc(doc(as('ana'), 'users/ana'), { email: 'otro@example.com' }))
    await assertSucceeds(updateDoc(doc(as('ana'), 'users/ana'), { email: deleteField(), uid: deleteField() }))
    await assertFails(updateDoc(doc(as('ana'), 'users/ana'), { email: 'ana@example.com' }))
  })
  test('avisos: cada uno guarda y borra sus dispositivos, nadie los lee', async () => {
    const token = (uid) => doc(as(uid), 'users/ana/tokens/tok123')
    await assertSucceeds(setDoc(token('ana'), { createdAt: serverTimestamp(), userAgent: 'test' }))
    await assertFails(setDoc(token('bea'), { createdAt: serverTimestamp(), userAgent: 'test' }))
    await assertFails(getDoc(token('ana')))
    await assertFails(setDoc(token('ana'), { createdAt: serverTimestamp(), spam: true }))
    await assertSucceeds(deleteDoc(token('ana')))
  })
  test('sin sesión no se lee nada', () => assertFails(getDoc(doc(anon(), 'tournaments', TID))))
})

describe('datos del motor', () => {
  test('se leen con sesión', () => assertSucceeds(getDoc(doc(as('ana'), 'tournaments', TID, 'players', 'p1'))))
  test('nadie escribe torneos', () => assertFails(setDoc(doc(as('ana'), 'tournaments', TID), { name: 'x' })))
  test('nadie cambia precios', () => assertFails(updateDoc(doc(as('ana'), 'tournaments', TID, 'players', 'p1'), { price: 1 })))
  test('nadie escribe puntos', () => assertFails(setDoc(doc(as('ana'), 'entries', `${TID}_ana`), { points: 999 })))
  test('nadie escribe la clasificación', () => assertFails(setDoc(doc(as('ana'), 'seasons/2026/standings/ana'), { points: 999 })))
})

describe('equipos', () => {
  const ref = (db, uid) => doc(db, 'picks', `${TID}_${uid}`)

  test('equipo válido antes de la primera salida', () => assertSucceeds(setDoc(ref(as('ana'), 'ana'), picks('ana'))))
  test('se puede cambiar antes de la salida', async () => {
    await setDoc(ref(as('ana'), 'ana'), picks('ana'))
    const team = ['p7', 'p2', 'p3', 'p4', 'p5', 'p6']
    await assertFails(setDoc(ref(as('ana'), 'ana'), picks('ana', { playerIds: team, cost: cost(team) }))) // 102M
    const cheap = ['p2', 'p3', 'p4', 'p5', 'p6', 'p1']
    await assertSucceeds(setDoc(ref(as('ana'), 'ana'), picks('ana', { playerIds: cheap, captainId: 'p6' })))
  })
  test('cerrado tras la primera salida', async () => {
    await seed({ lockInMinutes: -1 })
    await assertFails(setDoc(ref(as('ana'), 'ana'), picks('ana')))
  })
  test('el coste tiene que cuadrar con los precios', () => assertFails(setDoc(ref(as('ana'), 'ana'), picks('ana', { cost: 50 }))))
  test('sin jugadores repetidos', () => {
    const team = ['p1', 'p1', 'p3', 'p4', 'p5', 'p6']
    return assertFails(setDoc(ref(as('ana'), 'ana'), picks('ana', { playerIds: team, cost: cost(team) })))
  })
  test('exactamente 6 jugadores', () => {
    const team = TEAM.slice(0, 5)
    return assertFails(setDoc(ref(as('ana'), 'ana'), picks('ana', { playerIds: team, cost: cost(team) })))
  })
  test('jugadores que no están en el torneo', () => {
    const team = ['p1', 'p2', 'p3', 'p4', 'p5', 'nope']
    return assertFails(setDoc(ref(as('ana'), 'ana'), picks('ana', { playerIds: team, cost: cost(TEAM) })))
  })
  test('el capitán tiene que estar en el equipo', () => assertFails(setDoc(ref(as('ana'), 'ana'), picks('ana', { captainId: 'p7' }))))
  test('no se guarda el equipo de otro', () => assertFails(setDoc(ref(as('ana'), 'bea'), picks('bea'))))
  test('sin campos extra', () => assertFails(setDoc(ref(as('ana'), 'ana'), { ...picks('ana'), points: 500 })))
  test('el propio equipo se lee aunque no exista', () => assertSucceeds(getDoc(ref(as('ana'), 'ana'))))
  test('el equipo de otro es privado', async () => {
    await setDoc(ref(as('bea'), 'bea'), picks('bea'))
    await assertFails(getDoc(ref(as('ana'), 'bea')))
  })
})

describe('ligas', () => {
  async function createLeague(uid, lid = 'L1', code = 'ABC123') {
    const db = as(uid)
    const batch = writeBatch(db)
    batch.set(doc(db, 'leagues', lid), { name: 'Amigos', code, ownerUid: uid, memberIds: [uid], createdAt: serverTimestamp() })
    batch.set(doc(db, 'leagueCodes', code), { leagueId: lid })
    return batch.commit()
  }
  const join = (uid, lid = 'L1') => updateDoc(doc(as(uid), 'leagues', lid), { memberIds: arrayUnion(uid) })

  test('crear liga con su código', () => assertSucceeds(createLeague('ana')))
  test('no se crea una liga a nombre de otro', async () => {
    const db = as('ana')
    const batch = writeBatch(db)
    batch.set(doc(db, 'leagues', 'L1'), { name: 'Amigos', code: 'ABC123', ownerUid: 'bea', memberIds: ['bea'], createdAt: serverTimestamp() })
    batch.set(doc(db, 'leagueCodes', 'ABC123'), { leagueId: 'L1' })
    await assertFails(batch.commit())
  })
  test('no se reutiliza un código existente', async () => {
    await createLeague('ana')
    await assertFails(createLeague('bea', 'L2', 'ABC123'))
  })
  test('unirse con el código', async () => {
    await createLeague('ana')
    await assertSucceeds(getDoc(doc(as('bea'), 'leagueCodes', 'ABC123')))
    await assertFails(getDoc(doc(as('bea'), 'leagues', 'L1')))
    await assertSucceeds(join('bea'))
    await assertSucceeds(getDoc(doc(as('bea'), 'leagues', 'L1')))
  })
  test('no se mete a otra persona', async () => {
    await createLeague('ana')
    await assertFails(updateDoc(doc(as('bea'), 'leagues', 'L1'), { memberIds: arrayUnion('bea', 'carla') }))
  })
  test('salir de una liga; el creador no puede', async () => {
    await createLeague('ana')
    await join('bea')
    await assertSucceeds(updateDoc(doc(as('bea'), 'leagues', 'L1'), { memberIds: arrayRemove('bea') }))
    await assertFails(updateDoc(doc(as('ana'), 'leagues', 'L1'), { memberIds: arrayRemove('ana') }))
  })
  test('no se expulsa a nadie', async () => {
    await createLeague('ana')
    await join('bea')
    await assertFails(updateDoc(doc(as('ana'), 'leagues', 'L1'), { memberIds: arrayRemove('bea') }))
  })
  test('cada uno lista solo sus ligas', async () => {
    await createLeague('ana')
    await assertSucceeds(getDocs(query(collection(as('ana'), 'leagues'), where('memberIds', 'array-contains', 'ana'))))
    await assertFails(getDocs(collection(as('bea'), 'leagues')))
  })
  test('solo el creador borra la liga y su código', async () => {
    await createLeague('ana')
    await join('bea')
    const remove = (uid) => {
      const db = as(uid)
      const batch = writeBatch(db)
      batch.delete(doc(db, 'leagueCodes', 'ABC123'))
      batch.delete(doc(db, 'leagues', 'L1'))
      return batch.commit()
    }
    await assertFails(remove('bea'))
    await assertSucceeds(remove('ana'))
  })
  test('solo el creador renombra', async () => {
    await createLeague('ana')
    await join('bea')
    await assertFails(updateDoc(doc(as('bea'), 'leagues', 'L1'), { name: 'Mía' }))
    await assertSucceeds(updateDoc(doc(as('ana'), 'leagues', 'L1'), { name: 'Los de siempre' }))
  })
})
