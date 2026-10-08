// Prueba el motor de principio a fin contra el emulador con datos reales de ESPN guardados.
// npm run test:engine
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { before, describe, test } from 'node:test'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { rankBy, sync } from '../scripts/engine.mjs'
import { TEAM_SIZE } from '../src/lib/scoring.js'

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
