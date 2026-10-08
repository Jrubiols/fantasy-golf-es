// Prueba el motor de principio a fin contra el emulador con datos reales de ESPN guardados.
// npm run test:engine
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { before, describe, test } from 'node:test'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { rankBy, sync } from '../scripts/engine.mjs'
import { applySubstitutions, TEAM_SIZE } from '../src/lib/scoring.js'

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'))
const live = fixture('leaderboard-live')
const final = fixture('leaderboard-final')
const sources = (leaderboard) => ({
  leaderboard: async () => leaderboard,
  scoreboard: async () => fixture('scoreboard-live'),
  owgr: async () => fixture('owgr'),
})
const quiet = () => {}

const db = getFirestore(initializeApp({ projectId: 'demo-fantasy-golf' }))
db.settings({ ignoreUndefinedProperties: true })

async function clear() {
  for (const name of ['tournaments', 'picks', 'entries', 'seasons', 'config']) await db.recursiveDelete(db.collection(name))
}

/** Equipo válido: el más caro que quepa en 100M, empezando por el jugador indicado */
async function makePicks(tournamentId, uid, offset) {
  const snap = await db.collection('tournaments').doc(tournamentId).collection('players').orderBy('price', 'desc').get()
  const players = snap.docs.map((d) => d.data())
  const team = []
  let cost = 0
  for (const p of players.slice(offset)) {
    if (team.length < TEAM_SIZE && cost + p.price <= 100 - (TEAM_SIZE - team.length - 1) * 4) {
      team.push(p.id)
      cost += p.price
    }
  }
  await db.collection('picks').doc(`${tournamentId}_${uid}`).set({ uid, tournamentId, playerIds: team, captainId: team[0], cost, displayName: uid, photoURL: null })
  return { team, cost }
}

describe('rankBy', () => {
  test('empates comparten puesto', () => {
    assert.deepEqual(rankBy([30, 25, 25, 10], (x) => x).map((r) => r.rank), [1, 2, 2, 4])
  })
})

describe('torneo en juego', () => {
  const id = live.events[0].id
  const firstTee = new Date('2026-10-07T23:45:00Z')

  before(clear)

  test('antes de la primera salida: precios, sin equipos publicados', async () => {
    const summary = await sync(db, { sources: sources(live), now: new Date(firstTee - 86_400_000), log: quiet })
    assert.equal(summary.priced, 72)
    const players = await db.collection(`tournaments/${id}/players`).get()
    assert.equal(players.size, 72)
    const prices = players.docs.map((d) => d.data().price)
    assert.equal(Math.max(...prices), 25)
    assert.ok(Math.min(...prices) >= 4)
    assert.equal((await db.doc('config/current').get()).data().tournamentId, id)
    assert.equal((await db.collection('entries').get()).size, 0)
  })

  test('con la primera salida, los equipos se publican con puntos y puesto', async () => {
    const ana = await makePicks(id, 'ana', 0)
    await makePicks(id, 'bea', 10)
    assert.ok(ana.cost <= 100)
    const summary = await sync(db, { sources: sources(live), now: new Date('2026-10-08T12:00:00Z'), log: quiet })
    assert.equal(summary.entries, 2)
    const entries = (await db.collection('entries').get()).docs.map((d) => d.data())
    assert.ok(entries.every((e) => e.points > 0 && !e.final))
    assert.deepEqual(entries.map((e) => e.rank).sort(), [1, 2])

    const leader = (await db.doc(`tournaments/${id}/players/5054388`).get()).data()
    assert.equal(leader.name, 'Jacob Bridgeman')
    assert.equal(leader.holes.played, 18)
    assert.equal(leader.points, 64)
  })

  test('una segunda pasada sin cambios no reescribe jugadores', async () => {
    const summary = await sync(db, { sources: sources(live), now: new Date('2026-10-08T12:15:00Z'), log: quiet })
    assert.equal(summary.players, 0)
    assert.equal(summary.priced, 0)
  })

  test('guarda la hora de cierre como fecha', async () => {
    const tournament = (await db.doc(`tournaments/${id}`).get()).data()
    assert.equal(tournament.firstTeeTime.toDate().toISOString(), firstTee.toISOString())
  })
})

describe('torneo terminado', () => {
  const id = final.events[0].id

  before(clear)

  test('cierra el torneo y actualiza la temporada una sola vez', async () => {
    // Los equipos se hicieron antes de empezar
    await sync(db, { sources: sources(final), now: new Date('2026-09-30T00:00:00Z'), log: quiet })
    await makePicks(id, 'ana', 0)
    await makePicks(id, 'bea', 20)

    const summary = await sync(db, { sources: sources(final), now: new Date('2026-10-05T00:00:00Z'), log: quiet })
    assert.equal(summary.status, 'final')
    assert.equal(summary.standings, 2)

    const winner = (await db.doc(`tournaments/${id}/players/` + final.events[0].competitions[0].competitors.find((c) => c.status.position.displayName === '1').athlete.id).get()).data()
    assert.equal(winner.position, 1)
    assert.equal(winner.pointsBreakdown.position, 30)
    assert.equal(winner.pointsBreakdown.cut, 5)

    const cut = (await db.collection(`tournaments/${id}/players`).where('status', '==', 'cut').limit(1).get()).docs[0].data()
    assert.equal(cut.pointsBreakdown.cut, -10)

    const standings = (await db.collection('seasons/2026/standings').get()).docs.map((d) => d.data())
    assert.deepEqual(standings.map((s) => s.tournaments), [1, 1])
    assert.equal(standings.filter((s) => s.rank === 1).length >= 1, true)
    assert.equal((await db.doc(`tournaments/${id}`).get()).data().finalized, true)

    const again = await sync(db, { sources: sources(final), now: new Date('2026-10-05T00:15:00Z'), log: quiet })
    assert.equal(again.entries, 0)
    assert.equal(again.standings, 0)
  })
})

describe('avisos al móvil', () => {
  const id = live.events[0].id
  const firstTee = new Date('2026-10-07T23:45:00Z')

  // Mensajero falso: apunta lo enviado y da por caducado el token "caducado"
  function fakeMessenger() {
    const sent = []
    return {
      sent,
      async sendEachForMulticast(msg) {
        sent.push(msg)
        const responses = msg.tokens.map((t) => (t === 'caducado' ? { success: false, error: { code: 'messaging/registration-token-not-registered' } } : { success: true }))
        return { successCount: responses.filter((r) => r.success).length, responses }
      },
    }
  }

  before(async () => {
    await clear()
    await db.recursiveDelete(db.collection('users'))
    for (const [uid, token] of [['ana', 'tok-ana'], ['bea', 'tok-bea'], ['carla', 'caducado']]) {
      await db.doc(`users/${uid}/tokens/${token}`).set({ createdAt: new Date() })
    }
  })

  test('al publicarse los precios se avisa a todos, una sola vez', async () => {
    const messenger = fakeMessenger()
    const opts = { sources: sources(live), log: quiet, messenger }
    await sync(db, { ...opts, now: new Date(firstTee - 2 * 86_400_000) })
    assert.equal(messenger.sent.length, 3)
    assert.match(messenger.sent[0].notification.title, /Ya puedes hacer tu equipo/)
    assert.equal(messenger.sent[0].webpush.fcmOptions.link.endsWith('/draft'), true)
    // El token caducado se borra
    assert.equal((await db.doc('users/carla/tokens/caducado').get()).exists, false)

    await sync(db, { ...opts, now: new Date(firstTee - 2 * 86_400_000 + 900_000) })
    assert.equal(messenger.sent.length, 3)
  })

  test('3 horas antes, solo a quien no tiene equipo', async () => {
    await makePicks(id, 'ana', 0)
    const messenger = fakeMessenger()
    await sync(db, { sources: sources(live), log: quiet, messenger, now: new Date(firstTee - 2 * 3_600_000) })
    assert.deepEqual(messenger.sent.map((m) => m.tokens), [['tok-bea']])
    assert.match(messenger.sent[0].notification.title, /Últimas horas/)

    await sync(db, { sources: sources(live), log: quiet, messenger, now: new Date(firstTee - 3_600_000) })
    assert.equal(messenger.sent.length, 1)
  })

  test('al terminar, cada uno recibe su resultado', async () => {
    const finalId = final.events[0].id
    await sync(db, { sources: sources(final), log: quiet, now: new Date('2026-09-30T00:00:00Z') })
    await makePicks(finalId, 'ana', 0)
    await makePicks(finalId, 'bea', 20)
    const messenger = fakeMessenger()
    await sync(db, { sources: sources(final), log: quiet, messenger, now: new Date('2026-10-05T00:00:00Z') })
    const titles = messenger.sent.map((m) => m.notification.title)
    assert.equal(titles.length, 2)
    assert.ok(titles.some((t) => /Has ganado/.test(t)))
    assert.ok(titles.some((t) => /terminaste 2º de 2/.test(t)))
  })
})

describe('sustituto automático', () => {
  const field = [
    { id: 'a', price: 25, status: 'finished', rounds: [70] },
    { id: 'b', price: 20, status: 'finished', rounds: [70] },
    { id: 'c', price: 18, status: 'wd', rounds: [] },
    { id: 'd', price: 15, status: 'finished', rounds: [70] },
    { id: 'e', price: 12, status: 'wd', rounds: [75] },
    { id: 'f', price: 10, status: 'finished', rounds: [70] },
    { id: 'g', price: 8, status: 'finished', rounds: [70] },
    { id: 'h', price: 5, status: 'finished', rounds: [70] },
  ]

  test('el que se retira antes de jugar se cambia por el más caro que quepa', () => {
    // Equipo de 98M: sin c (18) quedan 80M gastados, cabe hasta 20M → entra b
    const r = applySubstitutions(['a', 'c', 'd', 'e', 'f', 'g'], 'c', field)
    assert.deepEqual(r.substitutions, [{ out: 'c', in: 'b' }])
    assert.equal(r.captainId, 'b')
    assert.deepEqual(r.playerIds, ['a', 'b', 'd', 'e', 'f', 'g'])
  })

  test('quien se retira después de empezar no se sustituye', () => {
    const r = applySubstitutions(['a', 'b', 'd', 'e', 'f', 'g'], 'a', field)
    assert.deepEqual(r.substitutions, [])
  })

  test('en el motor: el equipo publicado ya lleva el cambio', async () => {
    await clear()
    const id = final.events[0].id
    await sync(db, { sources: sources(final), now: new Date('2026-09-30T00:00:00Z'), log: quiet })
    const players = (await db.collection(`tournaments/${id}/players`).get()).docs.map((d) => d.data())
    const cheap = players.filter((p) => p.price <= 8 && p.status !== 'wd').slice(0, 5).map((p) => p.id)
    const team = ['4858859', ...cheap] // Neergaard-Petersen se retiró sin jugar
    await db.doc(`picks/${id}_ana`).set({ uid: 'ana', tournamentId: id, playerIds: team, captainId: '4858859', cost: 50, displayName: 'Ana', photoURL: null })
    await sync(db, { sources: sources(final), now: new Date('2026-10-05T00:00:00Z'), log: quiet })
    const entry = (await db.doc(`entries/${id}_ana`).get()).data()
    assert.equal(entry.substitutions.length, 1)
    assert.equal(entry.substitutions[0].out, '4858859')
    assert.ok(!entry.playerIds.includes('4858859'))
    assert.equal(entry.captainId, entry.substitutions[0].in)
  })
})
