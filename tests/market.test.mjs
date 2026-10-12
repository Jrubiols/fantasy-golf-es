// Subasta a ciegas del modo mercado
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { resolveAuction } from '../scripts/market.mjs'

const prices = new Map([['a', 25], ['b', 20], ['c', 15], ['d', 10], ['e', 8], ['f', 6], ['g', 5], ['h', 4]])
const bids = (entries) => new Map(entries.map(([uid, b, t]) => [uid, { bids: b, updatedAt: t }]))

test('gana la puja más alta; con empate, la primera en llegar', () => {
  const { teams, awards } = resolveAuction(bids([['ana', { a: 30 }, 2], ['bea', { a: 30 }, 1], ['carla', { a: 28 }, 0]]), prices)
  assert.deepEqual(teams.get('bea').playerIds, ['a'])
  assert.deepEqual(teams.get('ana').playerIds, [])
  assert.equal(awards.length, 1)
})

test('no cuentan pujas por debajo del precio ni golfistas que no juegan', () => {
  const { teams } = resolveAuction(bids([['ana', { a: 20, zz: 50, b: 20 }, 0]]), prices)
  assert.deepEqual(teams.get('ana').playerIds, ['b'])
})

test('presupuesto: si ya no le cabe, pasa al siguiente que pujó', () => {
  const { teams } = resolveAuction(bids([['ana', { a: 60, b: 45 }, 0], ['bea', { b: 21 }, 1]]), prices)
  assert.deepEqual(teams.get('ana').playerIds, ['a']) // 60 + 45 > 100
  assert.deepEqual(teams.get('bea').playerIds, ['b'])
  assert.equal(teams.get('ana').spent, 60)
})

test('máximo 6 golfistas por equipo', () => {
  const all = Object.fromEntries([...prices].map(([pid, p]) => [pid, p]))
  const { teams } = resolveAuction(bids([['ana', all, 0]]), prices)
  assert.equal(teams.get('ana').playerIds.length, 6)
  assert.ok(teams.get('ana').spent <= 100)
})
