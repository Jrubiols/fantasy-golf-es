// Equipo ideal: se compara con una búsqueda exhaustiva en un field pequeño
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { bestValue, idealTeam } from '../src/lib/ideal.js'
import { CAPTAIN_MULTIPLIER } from '../src/lib/scoring.js'

function bruteForce(players, budget, size) {
  let best = -Infinity
  const n = players.length
  const walk = (start, chosen) => {
    if (chosen.length === size) {
      const cost = chosen.reduce((s, p) => s + p.price, 0)
      if (cost > budget) return
      const max = Math.max(...chosen.map((p) => p.points))
      const total = chosen.reduce((s, p) => s + p.points, 0) + max * (CAPTAIN_MULTIPLIER - 1)
      best = Math.max(best, total)
      return
    }
    for (let i = start; i < n; i++) walk(i + 1, [...chosen, players[i]])
  }
  walk(0, [])
  return Math.round(best * 10) / 10
}

test('coincide con la búsqueda exhaustiva en campos aleatorios', () => {
  let seed = 7
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  for (let round = 0; round < 15; round++) {
    const players = Array.from({ length: 14 }, (_, i) => ({ id: `p${i}`, price: 4 + Math.round(rand() * 42) / 2, points: Math.round(rand() * 80 - 10) }))
    const ideal = idealTeam(players, { captains: 14 })
    assert.equal(ideal.points, bruteForce(players, 100, 6))
    assert.ok(ideal.cost <= 100)
    assert.equal(new Set(ideal.playerIds).size, 6)
  }
})

test('mejor compra: puntos por millón', () => {
  const top = bestValue([{ id: 'a', price: 25, points: 50 }, { id: 'b', price: 5, points: 20 }, { id: 'c', price: 10, points: -3 }])
  assert.deepEqual(top.map((p) => p.id), ['b', 'a'])
  assert.equal(top[0].perMillion, 4)
})
