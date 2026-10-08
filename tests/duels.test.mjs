// Duelos cara a cara: emparejamientos de liguilla y tabla
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { pairings, seasonDuels } from '../src/lib/duels.js'

test('liguilla: con 4 jugadores, en 3 jornadas cada uno se enfrenta a todos una vez', () => {
  const uids = ['a', 'b', 'c', 'd']
  const met = new Set()
  for (let r = 0; r < 3; r++) {
    const pairs = pairings(uids, r)
    assert.equal(pairs.length, 2)
    assert.deepEqual(pairs.flat().sort(), uids)
    for (const [x, y] of pairs) met.add([x, y].sort().join('-'))
  }
  assert.equal(met.size, 6)
})

test('con número impar, uno descansa (y siempre va segundo en la pareja)', () => {
  for (let r = 0; r < 5; r++) {
    const pairs = pairings(['a', 'b', 'c', 'd', 'e'], r)
    assert.equal(pairs.length, 3)
    assert.equal(pairs.filter(([, b]) => b === null).length, 1)
    assert.ok(pairs.every(([a]) => a !== null))
  }
})

test('tabla: victoria 3, empate 1; los torneos en juego no suman', () => {
  const t = (id, points, final = true) => ({ tournamentId: id, entries: Object.entries(points).map(([uid, p]) => ({ uid, points: p, final })) })
  const { table, weeks } = seasonDuels([
    t('t1', { a: 100, b: 80 }),
    t('t2', { a: 50, b: 50 }),
    t('t3', { a: 10, b: 90 }, false),
  ], ['a', 'b'])
  const a = table.find((r) => r.uid === 'a')
  const b = table.find((r) => r.uid === 'b')
  assert.deepEqual([a.won, a.drawn, a.lost, a.points], [1, 1, 0, 4])
  assert.deepEqual([b.won, b.drawn, b.lost, b.points], [0, 1, 1, 1])
  assert.equal(weeks[2].duels[0].final, false)
  assert.equal(weeks[2].duels[0].winner, 'b')
})
